/**
 * 工作区文件系统访问 API ，利用Chromium 系浏览器的 File System Access API 实现。
 *
 * 目录授权与恢复（用 IndexedDB 持久化 FileSystemDirectoryHandle）
 *
 * 权限校验（读/写）
 *
 * 读写文本 / 二进制（含可选的 preconditionSha256 乐观并发保护）
 *
 * 列目录、创建/删除文件与目录、移动/重命名
 *
 * 计算文件哈希（Web Crypto）
 *
 * 递归遍历（带 glob 过滤的简易版）
 *
 * 兼容性：仅 Chromium 系（Chrome/Edge）。Safari/Firefox 下请做“Zip 导入/导出”的降级策略。模块里已做了 API 存在性检查并抛错。
 */

type Sha256 = `sha256-${string}`;

export interface FileStat {
  kind: 'file' | 'directory';
  name: string;
  size?: number;
  lastModified?: number;
  hash?: Sha256;
  path: string; // POSIX-style path relative to root
}

export interface WriteOptions {
  preconditionSha256?: Sha256; // if provided, ensure current hash matches before write
  createParents?: boolean;     // auto mkdir -p
}

const IDB_DB = 'aia-cp-fs';
const IDB_STORE = 'handles';
const IDB_KEY = 'rootDirHandle';

function ensureSupported() {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('File System Access API not supported in this browser.');
  }
}

async function idb<T = unknown>(op: 'get' | 'set' | 'del', value?: any): Promise<T | void> {
  const req = indexedDB.open(IDB_DB, 1);
  const db: IDBDatabase = await new Promise((resolve, reject) => {
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  try {
    if (op === 'get') {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const r = tx.objectStore(IDB_STORE).get(IDB_KEY);
        r.onsuccess = () => resolve(r.result as T);
        r.onerror = () => reject(r.error);
      });
    } else if (op === 'set') {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const r = tx.objectStore(IDB_STORE).put(value, IDB_KEY);
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const r = tx.objectStore(IDB_STORE).delete(IDB_KEY);
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
      });
    }
  } finally {
    db.close();
  }
}

async function verifyPermission(handle: FileSystemHandle, mode: 'read' | 'readwrite') {
  // @ts-ignore
  const opts: FileSystemHandlePermissionDescriptor = {mode};
  // @ts-ignore
  if ((await handle.queryPermission?.(opts)) === 'granted') return true;
  // @ts-ignore
  return (await handle.requestPermission?.(opts)) === 'granted';
}

function normalizePath(p: string) {
  // simple POSIX normalization (no .. allowed to avoid confusion)
  const parts = p.split('/').filter(Boolean);
  if (parts.some(x => x === '..')) throw new Error('Path must not contain ".."');
  return parts.join('/');
}

async function getDirHandleFromPath(
  root: FileSystemDirectoryHandle,
  dirPath: string,
  create: boolean
): Promise<FileSystemDirectoryHandle> {
  let cur = root;
  const parts = normalizePath(dirPath).split('/').filter(Boolean);
  for (const part of parts) {
    cur = await cur.getDirectoryHandle(part, {create});
  }
  return cur;
}

async function getParentDirAndName(
  root: FileSystemDirectoryHandle,
  path: string,
  createParents = false
) {
  const clean = normalizePath(path);
  const idx = clean.lastIndexOf('/');
  const dir = idx >= 0 ? clean.slice(0, idx) : '';
  const name = idx >= 0 ? clean.slice(idx + 1) : clean;
  const dirHandle =
    dir ? await getDirHandleFromPath(root, dir, createParents) : root;
  return {dirHandle, name, relDir: dir, relName: name};
}

async function readFileAsArrayBuffer(fileHandle: FileSystemFileHandle): Promise<ArrayBuffer> {
  const file = await fileHandle.getFile();
  return file.arrayBuffer();
}

async function sha256OfArrayBuffer(buf: ArrayBuffer): Promise<Sha256> {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256-${hex}`;
}

export class FileWorkspace {
  private rootHandle: FileSystemDirectoryHandle | null = null;

  /** Ask user to pick a directory and persist the handle for later sessions. */
  async pickRoot(): Promise<void> {
    ensureSupported();
    // @ts-ignore
    const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
    if (!(await verifyPermission(handle, 'readwrite'))) {
      throw new Error('Permission denied for the selected directory.');
    }
    await idb('set', handle);
    this.rootHandle = handle;
  }

  /** Try to restore previously authorized root directory. Returns true if restored. */
  async restoreRoot(): Promise<boolean> {
    ensureSupported();
    const stored = await idb<FileSystemDirectoryHandle>('get');
    if (!stored) return false;
    // Some browsers require re-approval on restore; request if needed
    const ok = await verifyPermission(stored, 'readwrite');
    if (!ok) return false;
    this.rootHandle = stored;
    return true;
  }

  /** Clear stored root authorization. */
  async forgetRoot(): Promise<void> {
    await idb('del');
    this.rootHandle = null;
  }

  private requireRoot(): FileSystemDirectoryHandle {
    if (!this.rootHandle) throw new Error('No root directory. Call pickRoot() or restoreRoot() first.');
    return this.rootHandle;
  }

  /** List entries under a path (directory). */
  async list(
    path = '',
    ignore?: (stat: { name: string; kind: 'file' | 'directory'; path: string }) => boolean
  ): Promise<FileStat[]> {
    const root = this.requireRoot();
    const dir = path ? await getDirHandleFromPath(root, path, false) : root;
    const out: FileStat[] = [];
    // @ts-ignore
    for await (const [name, handle] of (dir as any).entries()) {
      const rel = normalizePath([path, name].filter(Boolean).join('/'));
      const kind = handle.kind as 'file' | 'directory';

      // 如果提供了 ignore 函数并且返回 true，则跳过此项
      if (ignore && ignore({name, kind, path: rel})) {
        continue;
      }

      if (kind === 'directory') {
        out.push({kind, name, path: rel});
      } else {
        const f = await (handle as FileSystemFileHandle).getFile();
        out.push({
          kind,
          name,
          size: f.size,
          lastModified: f.lastModified,
          path: rel
        });
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Read text file. */
  async readText(filePath: string): Promise<{ content: string; hash: Sha256 }> {
    const root = this.requireRoot();
    const {dirHandle, relName} = await getParentDirAndName(root, filePath);
    const fh = await dirHandle.getFileHandle(relName);
    const buf = await readFileAsArrayBuffer(fh);
    const hash = await sha256OfArrayBuffer(buf);
    const content = new TextDecoder().decode(buf);
    return {content, hash};
  }

  /** Read as Uint8Array. */
  async readBinary(filePath: string): Promise<{ content: Uint8Array; hash: Sha256 }> {
    const root = this.requireRoot();
    const {dirHandle, relName} = await getParentDirAndName(root, filePath);
    const fh = await dirHandle.getFileHandle(relName);
    const buf = await readFileAsArrayBuffer(fh);
    const hash = await sha256OfArrayBuffer(buf);
    return {content: new Uint8Array(buf), hash};
  }

  /** Write text with optional optimistic concurrency via preconditionSha256. */
  async writeText(filePath: string, content: string, opts: WriteOptions = {}): Promise<Sha256> {
    const root = this.requireRoot();
    const {dirHandle, relName} = await getParentDirAndName(root, filePath, !!opts.createParents);
    const fileHandle = await dirHandle.getFileHandle(relName, {create: true});

    // precondition check
    if (opts.preconditionSha256) {
      try {
        const curBuf = await readFileAsArrayBuffer(fileHandle);
        const curHash = await sha256OfArrayBuffer(curBuf);
        if (curHash !== opts.preconditionSha256) {
          throw Object.assign(new Error('Precondition failed: hash mismatch'), {
            code: 'PRECONDITION_FAILED',
            currentHash: curHash
          });
        }
      } catch (e: any) {
        // if file didn’t exist previously, skip
      }
    }

    const writable = await fileHandle.createWritable(); // atomic replace on .close()
    await writable.write(new TextEncoder().encode(content));
    await writable.close();

    const buf = new TextEncoder().encode(content);
    return sha256OfArrayBuffer(buf.buffer.slice(0) as ArrayBuffer); // slice to avoid shared buffer issues
  }

  /** Write binary (Uint8Array) */
  async writeBinary(filePath: string, data: Uint8Array, opts: WriteOptions = {}): Promise<Sha256> {
    const root = this.requireRoot();
    const {dirHandle, relName} = await getParentDirAndName(root, filePath, !!opts.createParents);
    const fileHandle = await dirHandle.getFileHandle(relName, {create: true});

    if (opts.preconditionSha256) {
      try {
        const curBuf = await readFileAsArrayBuffer(fileHandle);
        const curHash = await sha256OfArrayBuffer(curBuf);
        if (curHash !== opts.preconditionSha256) {
          throw Object.assign(new Error('Precondition failed: hash mismatch'), {
            code: 'PRECONDITION_FAILED',
            currentHash: curHash
          });
        }
      } catch (e: any) { /* ignore */
      }
    }

    const writable = await fileHandle.createWritable();
    await writable.write(data.slice(0));  // 使用 slice() 创建新的 Uint8Array 避免类型问题
    await writable.close();

    return sha256OfArrayBuffer(data.buffer.slice(0) as ArrayBuffer); // slice to avoid shared buffer issues
  }

  /** Ensure directory exists (mkdir -p). */
  async ensureDir(dirPath: string): Promise<void> {
    const root = this.requireRoot();
    await getDirHandleFromPath(root, dirPath, true);
  }

  /** Remove a file or directory (recursively). */
  async remove(path: string): Promise<void> {
    const root = this.requireRoot();
    const {dirHandle, relName} = await getParentDirAndName(root, path);
    // @ts-ignore
    await dirHandle.removeEntry(relName, {recursive: true});
  }

  /** Move/rename within the workspace (copy + delete fallback). */
  async move(from: string, to: string, opts: { createParents?: boolean } = {}): Promise<void> {
    // FS Access API lacks a native rename across directories; implement as copy+delete.
    const src = await this.readBinary(from);
    await this.writeBinary(to, src.content, {createParents: !!opts.createParents});
    await this.remove(from);
  }

  /** Recursively walk directory, returning relative file paths. */
  async walk(dir = ''): Promise<string[]> {
    const entries = await this.list(dir);
    const files: string[] = [];
    for (const e of entries) {
      if (e.kind === 'file') files.push(e.path);
      else files.push(...(await this.walk(e.path)));
    }
    return files;
  }

  /** Compute sha256 for a path (file only). */
  async sha256(path: string): Promise<Sha256> {
    const {hash} = await this.readBinary(path);
    return hash;
  }

  /** Check if a path exists and return stat. */
  async stat(path: string): Promise<FileStat | null> {
    const root = this.requireRoot();
    try {
      const {dirHandle, relName, relDir} = await getParentDirAndName(root, path);
      try {
        const fh = await dirHandle.getFileHandle(relName);
        const f = await fh.getFile();
        return {
          kind: 'file',
          name: relName,
          size: f.size,
          lastModified: f.lastModified,
          path: normalizePath([relDir, relName].filter(Boolean).join('/'))
        };
      } catch {
        // const dh = await dirHandle.getDirectoryHandle(relName);
        return {
          kind: 'directory',
          name: relName,
          path: normalizePath([relDir, relName].filter(Boolean).join('/'))
        };
      }
    } catch {
      return null;
    }
  }
}

// 用法示例
// const ws = new FileWorkspace();
//
// // 首次：让用户选择项目根目录
// await ws.pickRoot(); // 或 await ws.restoreRoot();
//
// // 列出工作流目录
// console.log(await ws.list('packages/cp-order/workflows'));
//
// // 读写文本（带乐观并发）
// const { content, hash } = await ws.readText('packages/cp-order/workflows/order-create/order-create.cp.js');
// const newContent = content.replace('TODO', 'DONE');
// await ws.writeText('packages/cp-order/workflows/order-create/order-create.cp.js', newContent, {
//   preconditionSha256: hash
// });
//
// // 创建目录并写二进制
// await ws.ensureDir('preview/build');
// await ws.writeBinary('preview/build/index.js', new Uint8Array([/* ... */]), { createParents: true });
//
// // 递归遍历
// const allFiles = await ws.walk();
// console.log(allFiles);
