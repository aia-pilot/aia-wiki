// 直接使用TypeScript接口定义文档类型
import {requestClient} from "#/api/request";
import { aiaSocket } from '#/utils/aia-socket';
import { message } from 'ant-design-vue';
import Debug from 'debug';
import { reactive } from 'vue';

const debug = Debug('aia:wiki');

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
  status: 'creating' | 'ready' | 'failed'; // 创建状态
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
  status!: 'creating' | 'ready' | 'failed';

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

  // 判断知识库是否处于创建中状态
  get isCreating() {
    return this.status === 'creating';
  }

  // 判断知识库是否已准备就绪
  get isReady() {
    return this.status === 'ready';
  }

  // 判断知识库是否创建失败
  get isFailed() {
    return this.status === 'failed';
  }
}

// 缓存所有处于创建中状态的知识库
const creatingWikisCache = new Map<string, 知识库VM>();

// 使用Vue的reactive缓存单个wiki，用于detail页面
const wikiCache = new Map<string, 知识库VM>();

// 初始化Socket监听
function initSocketListeners() {
  // 监听知识库创建成功事件
  aiaSocket.on('wiki-created', (data: { id: string; status: string; message: string }) => {
    debug('收到知识库创建成功消息:', data);
    const wiki = wikiCache.get(data.id);

    if (wiki) {
      // 更新知识库状态 - reactive对象会自动触发UI更新
      wiki.status = 'ready';
      debug(`知识库 ${data.id} 已更新为就绪状态`);
      message.success(data.message || '知识库创建成功');
    }

    // 同时更新旧缓存（为了保持其他功能正常）
    const oldWiki = creatingWikisCache.get(data.id);
    if (oldWiki) {
      oldWiki.status = 'ready';
      creatingWikisCache.delete(data.id);
    }
  });

  // 监听知识库创建失败事件
  aiaSocket.on('wiki-creation-failed', (data: { id: string; status: string; message: string }) => {
    debug('收到知识库创建失败消息:', data);
    const wiki = wikiCache.get(data.id);

    if (wiki) {
      // 更新知识库状态 - reactive对象会自动触发UI更新
      wiki.status = 'failed';
      debug(`知识库 ${data.id} 已更新为失败状态`);
      message.error(data.message || '知识库创建失败');
    }

    // 同时更新旧缓存（为了保持其他功能正常）
    const oldWiki = creatingWikisCache.get(data.id);
    if (oldWiki) {
      oldWiki.status = 'failed';
      creatingWikisCache.delete(data.id);
    }
  });
}

// 在模块初始化时设置Socket监听
initSocketListeners();

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

  const wikis = [...res.data.map(d => new 知识库VM(d)), ...fakeData];

  // 更新缓存中的Wiki状态
  wikis.forEach(wiki => {
    if (wiki.status === 'creating') {
      creatingWikisCache.set(wiki.id, wiki);
    }
  });

  return {data: wikis, total: res.total + fakeData.length};
}


const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠

/**
 * 获取Wiki详情
 * 返回一个响应式对象，该对象会根据socket事件自动更新
 */
export async function getWikiDetail(id: string) {
  // 首先检查响应式缓存中是否有知识库
  const cachedWiki = wikiCache.get(id);
  if (cachedWiki) {
    debug(`从响应式缓存获取知识库 ${id}, 状态: ${cachedWiki.status}`);
    return cachedWiki;
  }

  // 从模拟数据中查找
  let res = fakeData.find(item => item.id === id);
  if (res) {
    // 将结果转换为响应式对象并缓存
    const reactiveWiki = reactive(new 知识库VM(res));
    wikiCache.set(id, reactiveWiki);
    return reactiveWiki;
  }

  // 从服务器获取
  try {
    const wikiData = await requestClient.get<知识库>(`${aiaSvcBaseUrl}/wiki/${id}`, {
      withCredentials: true,
    });

    // 创建响应式对象并缓存
    const wiki = reactive(new 知识库VM(wikiData));
    wikiCache.set(id, wiki);

    // 如果是创建中状态，也添加到旧缓存（保持其他功能正常）
    if (wiki.status === 'creating') {
      creatingWikisCache.set(wiki.id, wiki);
    }

    return wiki;
  } catch (error) {
    debug(`获取知识库详情失败: ${error}`);
    throw error;
  }
}

/**
 * 创建Wiki
 */
export async function createWiki(data: Pick<知识库, '名称' | 'URL' | '类型' | '简介'>) {
  const res = await requestClient.post<知识库>(`${aiaSvcBaseUrl}/wiki/`, data, {
    withCredentials: true,
  });

  const newWiki = new 知识库VM(res);

  // 如果是创建中状态，添加到缓存
  if (newWiki.status === 'creating') {
    debug(`添加知识库 ${newWiki.id} 到创建缓存`);
    creatingWikisCache.set(newWiki.id, newWiki);
  }

  return newWiki;
}

// ['page', 'perpage', 'sortby', 'order', 'sort', 'offset', 'limit']
export interface Pagination {
  page: number; // 当前页码
  pageSize: number; // 每页条数
  // total: number; // 总条数
}

