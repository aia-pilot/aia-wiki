import {ref} from "vue";
import type {FileNode} from "#/views/cp/components/editor-sidebar/workspace-tree-item.vue";

// import {mainCP, parallelCPs} from "#/views/cp/viewmodels/cp-editor-state";
import {type FileStat, FileWorkspace} from "aia-cpm/cpls";
import {createEditableCP} from "aia-cpm/cpm";
import type {EJObject} from "aia-cpm/types";
import {makeTreeEditable} from "#/views/cp/models/ect/editable-ect";
import {type Node, create, relativePath2CpLocateStr} from "eaog/ect";

import Debug from 'debug';
const log = Debug('aia-wiki:workspace');
// const log = console.log.bind(console);

// 创建FileWorkspace实例
const workspace = new FileWorkspace();

export const localDirs = ref<FileNode[]>([]);
export const selected = ref<FileNode | undefined>();

export const isCpFile = (file: FileNode) => {
  return !file.isDirectory && file.path.endsWith('.cp.js');
}

// FileStat 转 FileNode 的转换函数
const fileStatToNode = (stat: FileStat): FileNode => {
  return {
    name: stat.name,
    path: stat.path,
    isDirectory: stat.kind === 'directory',
    size: stat.size || 0,
    lastModified: stat.lastModified ? new Date(stat.lastModified) : new Date(),
    expanded: false,
    children: [] // 暂时为空，后续递归填充
  };
};

// 递归构建文件树
const buildFileTree = async (dirPath = ''): Promise<FileNode[]> => {
  const ignoreFn = (stat: FileStat) => {
    // 忽略隐藏文件和目录
    return stat.name.startsWith('.') || stat.name === 'node_modules';
  }
  try {
    const stats = await workspace.list(dirPath, ignoreFn);
    const nodes: FileNode[] = [];

    for (const stat of stats) {
      const node = fileStatToNode(stat);
      if (stat.kind === 'directory') {
        // 目录节点暂不递归加载子节点，等展开时再加载
        node.children = [];
      }
      nodes.push(node);
    }

    return nodes;
  } catch (err) {
    log('构建文件树失败:', err);
    throw err;
  }
};

// 懒加载目录的子节点
export const expandDirectory = async (node: FileNode) => {
  if (!node.isDirectory) return; // 非目录则跳过

  try {
    // 只有当目录没有子项或子项为空时才进行加载
    if (!node.children || node.children.length === 0) {
      node.children = await buildFileTree(node.path);
    }
    node.expanded = true;
  } catch (err) {
    log('加载目录失败:', err);
    throw err;
  }
};

export const loadCPDirTree = async (force = false) => {
  if (!force && localDirs.value.length > 0) {
    // 如果已经加载过CP目录树且没有强制刷新，则直接返回
    return;
  }
  try {
    // 尝试恢复之前授权的目录
    const restored = await workspace.restoreRoot();
    if (restored) {
      const rootNode = await buildFileTree();
      addFileTrees(rootNode);
    } else {
      // 如果没有已授权的目录，显示空列表
      localDirs.value = [];
    }
  } catch (err: any) {
    log('获取CP列表失败:', err);
    throw err;
  }
}


export const loadCpToEditor = async () => {
  if (isCpFile(selected.value!)) {
    try {
      const cpLocateStr = relativePath2CpLocateStr(selected.value!.path, true);
      const ecp = await createEditableCP(cpLocateStr, workspace, create);
      // ecp.ect = makeTreeEditable(ecp.ect, ecp);
      ecp.ect = makeTreeEditable(ecp.ect as unknown as Node);
      log('Loaded EditableCP:', ecp);
      log('Parallel CPs', ecp.parallelCPs);

      // @ts-ignore TODO：改为新的EditableCP
      // mainCP.value = ecp;
      // @ts-ignore TODO：改为新的EditableCP
      // parallelCPs.value = ecp.parallelCPs; // TODO：改为新的EditableCP
      // await loadCpModuleFromFilePath(selected.value!.path);
    } catch (err) {
      log(`加载CP模块失败: `, err);
      throw err;
    }
  }
}

export const normalizeFileTree = (node: FileNode) => {
  node.expanded = false; // 默认不展开
  if (typeof node.lastModified === 'number') {
    node.lastModified = new Date(node.lastModified); // 确保lastModified是Date对象
  }
  if (node.children) {
    node.children.forEach(normalizeFileTree);
  }
}

const addFileTrees = (fileTrees: FileNode[]) => {
  // 遍历fileTrees，给每个节点加上expanded = false
  fileTrees.forEach(normalizeFileTree);
  localDirs.value = fileTrees || [];
  selected.value = localDirs.value[0];
  if (selected.value) {
    selected.value.expanded = true; // 默认选中第一个目录并展开
    // 如果是目录，展开它
    if (selected.value.isDirectory) {
      expandDirectory(selected.value);
    }
  }
}

export const openFolder = async () => {
  try {
    await workspace.pickRoot();
    const rootNodes = await buildFileTree();
    addFileTrees(rootNodes);
    if (selected.value) {
      // 不再使用localStorage，因为FileWorkspace已经使用IndexedDB存储根目录句柄
    }
    return true;
  } catch (error) {
    console.error('打开目录树对话框失败:', error);
    throw error;
  }
}

export const createFolder = async (parentPath: string, folderName: string) => {
  if (!folderName || !selected.value || !selected.value.isDirectory) {
    throw new Error('请选择一个目录并输入有效的目录名称');
  }

  try {
    const newFolderPath = `${parentPath}/${folderName}`.replace(/\/\//g, '/');
    await workspace.ensureDir(newFolderPath);

    // 更新文件树
    const newFolder: FileNode = {
      name: folderName,
      path: newFolderPath,
      isDirectory: true,
      size: 0,
      lastModified: new Date(),
      expanded: true,
      children: []
    };
    selected.value.children!.unshift(newFolder);
    selected.value = newFolder; // 选中新建的目录
    return newFolder;
  } catch (error) {
    console.error('新建目录失败:', error);
    throw error;
  }
}

export const renameFile = async (file: FileNode, newName: string) => {
  if (newName && newName !== file.name) {
    try {
      const oldPath = file.path;
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const newPath = `${parentPath}/${newName}`;

      await workspace.move(oldPath, newPath);
      file.name = newName; // 更新文件名
      file.path = newPath; // 更新路径
      log('File renamed to:', newName);
      return true;
    } catch (error) {
      console.error('重命名失败:', error);
      throw error;
    }
  }
  return false;
}

export const deleteFile = async (file: FileNode) => {
  try {
    await workspace.remove(file.path);
    if (selected.value?.children) {
      const index = selected.value.children.indexOf(file);
      if (index !== undefined && index > -1) {
        selected.value.children.splice(index, 1); // 从当前目录中删除
      }
    }
    log('File deleted:', file.name);
    return true;
  } catch (error) {
    console.error('删除失败:', error);
    throw error;
  }
}

export const refreshDirectory = async () => {
  try {
    if (localDirs.value.length > 0) {
      // 重新获取根目录下的文件列表
      const rootNodes = await buildFileTree();
      addFileTrees(rootNodes);
      return true;
    }
    return false;
  } catch (error) {
    console.error('刷新目录失败:', error);
    throw error;
  }
}

export const handleFileSelect = (file: FileNode) => {
  selected.value = file;
  log('Selected file:', file);

  // 如果选中的是目录并且没有加载子项，则加载
  if (file.isDirectory && (!file.children || file.children.length === 0)) {
    expandDirectory(file);
  }

  return loadCpToEditor();
}

export const saveCpToFile = async (cp: EditableCP, isNew: boolean, newFileName?: string) => {
//   if (isNew) {
//     if (!newFileName) {
//       throw new Error('保存新文件需要提供文件名');
//     }
//     cp.filePath = getCurrentDirPath() + '/' + newFileName + '.cp.js';
//   } else if (!cp.filePath) {
//     throw new Error('当前CP没有文件路径，无法保存');
//   }
//
//   const filePath = cp.filePath!
//
//
//   const options =  {maxInlineLength: 120, indent: 2, keyNoQuotation: true}
//   const eaogStr = compactJson(cp.eaog, options);
//   const hooksStr = compactJson(cp.hooks, options);
//   const sideCPsStr = compactJson(cp.sideCPs!, options);
//   const frameworksStr = compactJson(cp.frameworks, options);
//
//   const code = `// Auto-generated CP file
// export const eaog = ${eaogStr};\n
// export const hooks = ${hooksStr};\n
// export const sideCPs = ${sideCPsStr};\n
// export const frameworks = ${frameworksStr};\n`;
//
//   log(`保存CP模块到工作区, file path: ${filePath}`);
//
//   try {
//     await workspace.writeText(filePath, code, { createParents: true });
//
//     // 如果是新文件，刷新目录以显示它
//     if (isNew) {
//       const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
//       const parentNode = findNodeByPath(parentPath);
//
//       if (parentNode && parentNode.isDirectory) {
//         // 重新加载该目录
//         parentNode.children = await buildFileTree(parentNode.path);
//       }
//     }
//
//     return true;
//   } catch (err: any) {
//     log('保存CP模块到工作区失败:', err);
//     throw err;
//   }
}
//
// function getCurrentDirPath() {
//   if (!selected.value) {
//     throw new Error('没有选中的目录或文件');
//   }
//   return selected.value.isDirectory ? selected.value.path : selected.value.path.substring(0, selected.value.path.lastIndexOf('/'));
// }
//
// // 根据路径查找节点
// function findNodeByPath(path: string): FileNode | null {
//   if (!path) return null;
//
//   // 处理根目录情况
//   if (path === '' && localDirs.value.length > 0) {
//     return localDirs.value[0]!;
//   }
//
//   // 递归查找函数
//   function findInNode(node: FileNode, targetPath: string): FileNode | null {
//     if (node.path === targetPath) return node;
//     if (node.isDirectory && node.children) {
//       for (const child of node.children) {
//         const found = findInNode(child, targetPath);
//         if (found) return found;
//       }
//     }
//     return null;
//   }
//
//   // 从所有根节点开���查找
//   for (const rootNode of localDirs.value) {
//     const found = findInNode(rootNode, path);
//     if (found) return found;
//   }
//
//   return null;
// }
