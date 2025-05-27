// 直接使用TypeScript接口定义文档类型
import {requestClient} from "#/api/request";

export interface 文档 {
  id: string;       // 文档uuid
  title: string;    // 文档标题
  path: string;     // 在知识库内，相对于根目录的路径
}

// 定义作者类型
export interface 作者 {
  uid: string;      // 用户id
  username: string; // 用户名
}

// 定义知识库类型
export interface 知识库 {
  id: string;                             // 知识库id
  名称: string;                           // 项目、工作等名称
  URL: string;                            // 项目地址, 网上或者本地
  类型: '开源' | '企业' | '个人' | '其他';  // 类型
  简介: string;                           // 简介
  作者: 作者;                             // 作者信息
  生成时间: number;                        // Unix timestamp
  更新时间: number;                        // Unix timestamp
  收藏数: number;                          // 收藏数
  文档列表: 文档[];                        // 文档列表
  status: 'creating' | 'ready';           // 创建状态
}

export class 知识库VM implements 知识库 {
  id!: string;
  名称!: string;
  URL!: string;
  类型!: '开源' | '企业' | '个人' | '其他';
  简介!: string;
  作者!: 作者;
  生成时间!: number;
  更新时间!: number;
  收藏数!: number;
  文档列表!: 文档[];
  status!: 'creating' | 'ready';

  constructor(data: 知识库) {
    Object.assign(this, data);
  }

  get icon() {
    switch (this.类型) {
      case '开源':
        return 'carbon:logo-github';
      case '企业':
        return 'carbon:enterprise';
      case '个人':
        return 'carbon:user';
      default:
        return 'carbon:document';
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
  // total: number; // 总条数
}

const fakeData: 知识库VM[] = [
  {
    id: '1',
    名称: '项目1',
    URL: 'https://example.com/project1',
    类型: '开源',
    简介: '这是一个开源项目的简介。',
    作者: {
      uid: '123',
      username: '作者1',
    },
    生成时间: Date.now(),
    更新时间: Date.now(),
    收藏数: 10,
    文档列表: [
      {id: '1', title: '文档1', path: 'docs/doc1.md'},
      {id: '2', title: '文档2', path: 'docs/doc2.md'},
      {id: '3', title: '文档3', path: 'docs/doc3.md'},
    ],
    status: 'ready',
  },
  {
    id: '2',
    名称: '项目2',
    URL: 'https://example.com/project2',
    类型: '企业',
    简介: '这是一个企业项目的简介。',
    作者: {
      uid: '456',
      username: '作者2',
    },
    生成时间: Date.now(),
    更新时间: Date.now(),
    收藏数: 20,
    文档列表: [
      {id: '4', title: '文档4', path: 'docs/doc4.md'},
      {id: '5', title: '文档5', path: 'docs/doc5.md'},
    ],
    status: 'ready',
  }
  // @ts-ignore
].map(item => new 知识库VM(item));

/**
 * 根据分页参数，获取Wiki列表
 */
export async function getWikiList(params: Pagination) {
  const url = `${aiaSvcBaseUrl}/wiki?${`page=${params.page}&perpage=${params.pageSize}`}`;
  const res = await requestClient.get<{ data: 知识库[]; total: number; }>(url, {
    withCredentials: true,
  });
  return {data: [...res.data.map(d => new 知识库VM(d)), ...fakeData], total: res.total + fakeData.length};
}


const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠

/**
 * 获取Wiki详情
 */
export async function getWikiDetail(id: string) {
  let res = fakeData.find(item => item.id === id);
  return res ? res : new 知识库VM(await requestClient.get<知识库>(`${aiaSvcBaseUrl}/wiki/${id}`, {
    withCredentials: true,
  }));
}

/**
 * 创建Wiki
 */
export async function createWiki(data: Pick<知识库, '名称' | 'URL' | '类型' | '简介'>) {
  const res = await requestClient.post<知识库>(`${aiaSvcBaseUrl}/wiki/`, data, {
    withCredentials: true,
  });

  const newWiki = new 知识库VM(res);
  // setTimeout(() => newWiki.status = 'ready', 10000); // @DEV 测试转场loading效果
  return newWiki;
}
