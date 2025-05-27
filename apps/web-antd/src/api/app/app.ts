// 直接使用TypeScript接口定义智能应用类型
import {requestClient} from "#/api/request";

// 定义作者类型
export interface 作者 {
  uid: string;      // 用户id
  username: string; // 用户名
}

// 定义智能应用类型
export interface 智能应用 {
  id: string;                                 // 智能应用id
  名称: string;                               // 智能应用名称
  简介: string;                               // 智能应用简介
  tags: string[];                             // 标签列表
  作者: 作者;                                 // 作者信息
  CP文件路径: string;                          // CP文件在文件系统中的路径
  生成时间: number;                            // Unix timestamp
  更新时间: number;                            // Unix timestamp
  status: 'creating' | 'ready' | 'deprecated'; // 状态
  收藏数: number;                               // 收藏数
  使用次数: number;                             // 使用次数
  共享成果总数: number;                         // 共享成果总数
}

export class 智能应用VM implements 智能应用 {
  id!: string;
  名称!: string;
  简介!: string;
  tags!: string[];
  作者!: 作者;
  CP文件路径!: string;
  生成时间!: number;
  更新时间!: number;
  status!: 'creating' | 'ready' | 'deprecated';
  收藏数!: number;
  使用次数!: number;
  共享成果总数!: number;

  constructor(data: 智能应用) {
    Object.assign(this, data);
  }

  get icon() {
    // 根据应用标签或名称特征返回不同的图标
    if (this.tags.includes('AI')) {
      return 'carbon:artificial-intelligence';
    } else if (this.tags.includes('工具')) {
      return 'carbon:tools';
    } else if (this.tags.includes('教育')) {
      return 'carbon:education';
    } else if (this.名称.toLowerCase().includes('assistant')) {
      return 'carbon:chat';
    } else {
      return 'carbon:application';
    }
  }

  get 更新时间Str() {
    return new Date(this.更新时间).toLocaleDateString();
  }
}

// ['page', 'perpage', 'sortby', 'order', 'sort', 'offset', 'limit']
export interface Pagination {
  page: number; // 当前页码
  pageSize: number; // 每页条数
}

const fakeData: 智能应用VM[] = [
  {
    id: '1',
    名称: 'AIA智能助手',
    简介: '基于大语言模型的智能对话助手，可以回答问题和提供帮助。',
    tags: ['AI', '助手', '对话'],
    作者: {
      uid: '123',
      username: '开发者A'
    },
    CP文件路径: '/path/to/cp/file1.cp',
    生成时间: Date.now() - 1000000,
    更新时间: Date.now() - 500000,
    status: 'ready',
    收藏数: 42,
    使用次数: 320,
    共享成果总数: 15
  },
  {
    id: '2',
    名称: '代码生成器',
    简介: '根据需求描述自动生成代码，支持多种编程语言。',
    tags: ['工具', '开发', 'AI'],
    作者: {
      uid: '456',
      username: '开发者B'
    },
    CP文件路径: '/path/to/cp/file2.cp',
    生成时间: Date.now() - 2000000,
    更新时间: Date.now() - 100000,
    status: 'ready',
    收藏数: 38,
    使用次数: 250,
    共享成果总数: 10
  }
  // @ts-ignore
].map(item => new 智能应用VM(item));


const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠

/**
 * 获取智能应用列表
 */
export async function getAppList(params: Pagination) {
  try {
    const url = `${aiaSvcBaseUrl}/app?${`page=${params.page}&perpage=${params.pageSize}`}`;
    const res = await requestClient.get<{ data: 智能应用[]; total: number; }>(url, {
      withCredentials: true,
    });

    return {
      data: [...res.data.map(d => new 智能应用VM(d)), ...fakeData],
      total: res.total + fakeData.length
    };
  } catch (error) {
    console.error('获取智能应用列表失败:', error);
    return { data: fakeData, total: fakeData.length };
  }
}

/**
 * 获取智能应用详情
 */
export async function getAppDetail(id: string) {
  try {
    const res = await requestClient.get<智能应用>(`${aiaSvcBaseUrl}/app/${id}`, {
      withCredentials: true,
    });

    return new 智能应用VM(res);
  } catch (error) {
    console.error('获取智能应用详情失败:', error);
    const fakeApp = fakeData.find(item => item.id === id);
    return fakeApp || null;
  }
}

/**
 * 创建智能应用
 */
export async function createApp(data: Pick<智能应用, '名称' | '简介' | 'tags' | 'CP文件路径'>) {
  try {
    const res = await requestClient.post<智能应用>(`${aiaSvcBaseUrl}/app/`, data, {
      withCredentials: true,
    });

    return new 智能应用VM(res);
  } catch (error) {
    console.error('创建智能应用失败:', error);

    // 创建失败，返回一个假数据
    return new 智能应用VM({
      ...data,
      id: Math.random().toString(36).substring(2, 15),
      作者: {
        uid: '123',
        username: '当前用户'
      },
      生成时间: Date.now(),
      更新时间: Date.now(),
      status: 'creating',
      收藏数: 0,
      使用次数: 0,
      共享成果总数: 0
    });
  }
}

/**
 * 更新智能应用
 */
export async function updateApp(id: string, data: Partial<智能应用>) {
  try {
    await requestClient.patch<any>(`${aiaSvcBaseUrl}/app/${id}`, data, {
      withCredentials: true,
    });

    return true;
  } catch (error) {
    console.error('更新智能应用失败:', error);
    return false;
  }
}

/**
 * 删除智能应用
 */
export async function deleteApp(id: string) {
  try {
    await requestClient.delete<any>(`${aiaSvcBaseUrl}/app/${id}`, {
      withCredentials: true,
    });

    return true;
  } catch (error) {
    console.error('删除智能应用失败:', error);
    return false;
  }
}
