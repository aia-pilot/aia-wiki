// filepath: /Users/wangqing/IdeaProjects/abc-study-copilot/packages/aia-wiki-new/apps/web-antd/src/views/cp/models/project.ts
import {ref, type Ref} from 'vue';
import {type IDBPDatabase, openDB} from 'idb';
import Debug from 'debug';

const debug = Debug('aia:cp:project');

// 定义文件类型
export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  projectId: string; // 添加projectId字段，确保文件和项目关联
  parentId?: string;
  content?: any; // 文件内容，对于EAOG文件，存储其数据结构
  children?: ProjectFile[];
  isEaog?: boolean; // 是否为EAOG文件
  meta?: Record<string, any>; // 元数据
  createdAt: Date; // 添加创建时间字段
  updatedAt: Date; // 添加更新时间字段
}

// 将项目类型转换为类
export class Project {
  id: string;
  name: string;
  description?: string;
  files: ProjectFile[]; // 仅仅是顶层文件/文件夹列表
  updatedAt: Date;
  createdAt: Date;

  constructor(data: {
    id: string;
    name: string;
    description?: string;
    files?: ProjectFile[];
    updatedAt?: Date;
    createdAt?: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description || '';
    this.files = data.files || [];
    this.updatedAt = data.updatedAt || new Date();
    this.createdAt = data.createdAt || new Date();
  }

  // 获取项目中的所有文件（扁平列表）
  getAllFiles(): ProjectFile[] {
    const allFiles: ProjectFile[] = [];

    // 递归收集文件
    const collectFiles = (files: ProjectFile[]) => {
      for (const file of files) {
        allFiles.push(file);
        if (file.children && file.children.length > 0) {
          collectFiles(file.children);
        }
      }
    };

    collectFiles(this.files);
    return allFiles;
  }

  // 根据文件ID获取文件
  getFileById(fileId: string): ProjectFile | undefined {
    // 递归查找文件
    const findFile = (files: ProjectFile[]): ProjectFile | undefined => {
      for (const file of files) {
        if (file.id === fileId) {
          return file;
        }
        if (file.children && file.children.length > 0) {
          const found = findFile(file.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    return findFile(this.files);
  }

  async createFileByContent(name: string, content: any) {
    if (!name || !content) {
      throw new Error('文件名和内容不能为空');
    }
    await projectManager.addFile({
      name, content, type: 'file', projectId: this.id, parentId: currentFolder.value?.id || null, isEaog: true
    })
    await projectManager.loadProjectFiles(); // 重新加载文件树
  }

  async updateFileContent(fileId: string, content: any): Promise<void> {
    const file = this.getFileById(fileId);
    if (file) {
      file.content = content;
      await projectManager.updateFile(file);
      debug(`更新文件内容: ${file.name}`);
    } else {
      debug(`未找到文件: ${fileId}`);
    }
  }
}

// 当前项目的响应式引用
export const currentProject: Ref<Project | null> = ref(null);
// 当前选中的文件
export const currentFile: Ref<ProjectFile | null> = ref(null);
// 当前选中的文件夹（用于创建子文件/文件夹）
export const currentFolder: Ref<ProjectFile | null> = ref(null);
// 项目文件树数据
export const projectTree: Ref<ProjectFile[]> = ref([]);

// 数据库名称和版本
const DB_NAME = 'cp-editor-db';
const DB_VERSION = 1;

// 项目管理类
export class ProjectManager {
  private db: IDBPDatabase | null = null;

  // 初始化数据库
  async initDB(): Promise<void> {
    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // 创建项目存储
          if (!db.objectStoreNames.contains('projects')) {
            db.createObjectStore('projects', { keyPath: 'id' });
          }
          // 创建文件存储
          if (!db.objectStoreNames.contains('files')) {
            const fileStore = db.createObjectStore('files', { keyPath: 'id' });
            fileStore.createIndex('projectId', 'projectId', { unique: false });
          }
        }
      });
      debug('项目数据库初始化成功');
    } catch (error) {
      console.error('初始化项目数据库失败:', error);
      throw error;
    }
  }

  // 创建默认项目
  async createDefaultProject(): Promise<void> {
    if (!this.db) await this.initDB();

    // 检查是否已存在默认项目
    const existingProject = await this.db!.get('projects', 'default');

    if (!existingProject) {
      const defaultProject = new Project({
        id: 'default',
        name: '默认项目',
        description: '默认CP编辑器项目',
        files: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await this.db!.put('projects', defaultProject);
      currentProject.value = defaultProject;
      debug('创建默认项目成功:', defaultProject);
    } else {
      // 将从数据库获取的数据转换为Project实例
      currentProject.value = new Project(existingProject);
      debug('加载现有默认项目:', currentProject.value);
    }

    // 加载项目文件树
    await this.loadProjectFiles();
  }

  // 加载项目文件
  async loadProjectFiles(): Promise<void> {
    if (!this.db) await this.initDB();
    if (!currentProject.value) await this.createDefaultProject();

    const tx = this.db!.transaction('files', 'readonly');
    const index = tx.store.index('projectId');
    const files = await index.getAll(currentProject.value!.id);

    // 构建文件��
    const fileMap = new Map<string, ProjectFile>();
    const rootFiles: ProjectFile[] = [];

    // 第一遍：将所有文件放入Map
    files.forEach(file => {
      fileMap.set(file.id, { ...file, children: [] });
    });

    // 第二遍：构建树结构
    files.forEach(file => {
      const currentFile = fileMap.get(file.id)!;

      if (file.parentId) {
        const parent = fileMap.get(file.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(currentFile);
        } else {
          rootFiles.push(currentFile);
        }
      } else {
        rootFiles.push(currentFile);
      }
    });

    projectTree.value = rootFiles;

    // 更新当前项目的文件列表
    if (currentProject.value) {
      currentProject.value.files = rootFiles;
    }

    debug('项目文件树加载成功:', projectTree.value);
  }

  // 添加文件
  async addFile(file: Omit<ProjectFile, 'id' | 'createdAt' | 'updatedAt'> & { projectId: string }): Promise<string> {
    if (!this.db) await this.initDB();

    const now = new Date();
    const newFile: ProjectFile = {
      ...file,
      id: crypto.randomUUID(),
      children: file.type === 'directory' ? [] : undefined,
      createdAt: now,
      updatedAt: now
    };

    // 保存到数据库
    await this.db!.put('files', newFile);

    // 同时更新内存中的文件树结构
    if (newFile.parentId) {
      // 如果有父文件夹，找到父文件夹并添加到其子节点
      const updateFileInTree = (files: ProjectFile[], parentId: string): boolean => {
        for (const item of files) {
          if (item.id === parentId) {
            // 找到父文件夹，添加新文件到其子节点
            item.children = item.children || [];
            item.children.push(newFile);
            return true;
          }
          // 递归查找子文件夹
          if (item.children && item.children.length > 0) {
            if (updateFileInTree(item.children, parentId)) {
              return true;
            }
          }
        }
        return false;
      };

      // 尝试在文件树中更新
      if (!updateFileInTree(projectTree.value, newFile.parentId)) {
        // 如果找不到父节点，回退到重新加载整个文件树
        await this.loadProjectFiles();
      }
    } else {
      // 如果是根级文件/文件夹，直接添加到根节点
      projectTree.value.push(newFile);
    }

    debug('文件添加成功:', newFile);
    return newFile.id;
  }

  // 更新文件
  async updateFile(file: ProjectFile): Promise<void> {
    if (!this.db) await this.initDB();
    file.updatedAt = new Date(); // 更新文件的更新时间
    await this.db!.put('files', file);
    await this.loadProjectFiles(); // 重新加载文件树
  }

  // 删除文件
  async deleteFile(fileId: string): Promise<void> {
    if (!this.db) await this.initDB();

    // 获取待删除的文件
    const fileToDelete = await this.getFileById(fileId);
    if (!fileToDelete) {
      debug(`未找到要删除的文件: ${fileId}`);
      return;
    }

    // 如果是文件夹，需要递归删除所有子文件
    if (fileToDelete.type === 'directory' && fileToDelete.children && fileToDelete.children.length > 0) {
      // 递归删除子文件
      const deleteChildren = async (children: ProjectFile[]) => {
        for (const child of children) {
          if (child.type === 'directory' && child.children && child.children.length > 0) {
            await deleteChildren(child.children);
          }
          await this.db!.delete('files', child.id);
          debug(`删除子文件/文件夹: ${child.name} (${child.id})`);
        }
      };

      await deleteChildren(fileToDelete.children);
    }

    // 删除当前文件/文件夹
    await this.db!.delete('files', fileId);
    debug(`删除文件/文件夹: ${fileToDelete.name} (${fileId})`);

    // 如果删除的是当前选中的文件或文件夹，清除当前选择
    if (currentFile.value && currentFile.value.id === fileId) {
      currentFile.value = null;
    }
    if (currentFolder.value && currentFolder.value.id === fileId) {
      currentFolder.value = null;
    }

    await this.loadProjectFiles(); // 重新加载文件树
  }

  // 选择文件
  selectFile(file: ProjectFile): void {
    currentFile.value = file;
    debug('选择文件:', file);
  }

  // 获取适配Tree组件的数据结构
  getTreeData(): any[] {
    // 转换为Tree组件所需的数据格式
    function convertToTreeData(files: ProjectFile[]): any[] {
      return files.map(file => ({
        // key: file.id + Date.now(), // 添加唯一标识符，避免重复
        key: file.id, // <TransitionGroup> children must be keyed.
        id: file.id,
        title: file.name,
        isLeaf: file.type === 'file',
        type: file.type,
        updatedAt: file.updatedAt,
        meta: {
          icon: file.type === 'directory' ? 'mdi:folder-outline' : file.isEaog ? 'mdi:file-document-outline' : 'mdi:file-outline',
          title: file.name
        },
        isEaog: file.isEaog,
        content: file.content,
        parentId: file.parentId,
        children: file.children && file.children.length > 0 ? convertToTreeData(file.children) : undefined
      }));
    }

    return convertToTreeData(projectTree.value);
  }

  // 根据文件ID获取文件
  async getFileById(fileId: string): Promise<ProjectFile | undefined> {
    if (!this.db) await this.initDB();

    // 先尝试使用当前项目的方法查找内存中的文件
    if (currentProject.value) {
      const fileInMemory = currentProject.value.getFileById(fileId);
      if (fileInMemory) return fileInMemory;
    }

    // 若内存中找不到，则从数据库获取
    return await this.db!.get('files', fileId);
  }

  // 获取项目中的所有文件
  async getAllFiles(projectId: string = 'default'): Promise<ProjectFile[]> {
    if (!this.db) await this.initDB();

    // 先尝试从内存中获取
    if (currentProject.value && currentProject.value.id === projectId) {
      return currentProject.value.getAllFiles();
    }

    // 从数据库获取
    const tx = this.db!.transaction('files', 'readonly');
    const index = tx.store.index('projectId');
    return await index.getAll(projectId);
  }

  // 设置当前选中的文件夹
  setCurrentFolder(fileKey: string | null): void {
    const file: ProjectFile = currentProject.value?.getFileById(fileKey || '') || null;
    currentFolder.value = file?.type === 'directory' ? file :
      // 是文件，当前目录是其父，即其所在目录
      currentProject.value?.getFileById(file?.parentId || '') || null;
    debug('设置当前文件夹:', currentFolder.value);
  }

  async updateOrCreateFile(name: string, content: string): void {
    if (!currentProject.value) {
      debug('当前项目未加载，无法更新或创建文件');
      return;
    }

    if (!currentFile.value) {
      await currentProject.value.createFileByContent(name, content);
    } else {
      await currentProject.value.updateFileContent(currentFile.value.id, content);
    }
  }
}

// 创建并导出ProjectManager实例
export const projectManager = new ProjectManager();
