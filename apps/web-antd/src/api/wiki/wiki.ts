// 直接使用TypeScript接口定义文档类型
import {requestClient} from "#/api/request";
import {aiaSocket} from '#/utils/aia-socket';
import {message} from 'ant-design-vue';
import Debug from 'debug';
import {reactive} from 'vue';
// import {router} from '#/router';

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
const wikiCache = new Map<string, 知识库VM>();

// 初始化Socket监听
function initSocketListeners() {
  // 监听知识库创建成功事件
  aiaSocket.on('wiki-created', async(data: { id: string; status: string; message: string }) => {
    message.success(data.message || '知识库创建成功');
    debug(`知识库 ${data.id} 创建成功，状态：${data.status}`);
    const wiki = wikiCache.get(data.id);
    if (wiki) {
      const newWiki = await getWikiDetail(data.id);
      // 逐个赋值以保持响应式
      for (const key in newWiki) {
        // @ts-ignore
        wiki[key] = newWiki[key];
      }
      wikiCache.delete(data.id); // 从创建缓存中删除
    }
  });

  // 监听知识库创建失败事件
  aiaSocket.on('wiki-creation-failed', async (data: { id: string; status: string; message: string }) => {
    message.error(data.message || '知识库创建失败', 5);
    debug(`知识库 ${data.id} 创建失败，状态：${data.status}`);
    const wiki = wikiCache.get(data.id);
    // @ts-ignore
    wiki.status = 'failed'; // 更新状态为失败
    wikiCache.delete(data.id); // 从创建缓存中删除
  })
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
    status: 'creating', // 模拟创建中状态
  }
  // @ts-ignore
].map(item => new 知识库VM(item));

const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠

/**
 * 根据分页参数，获取Wiki列表
 */
export async function getWikiList(params: Pagination) {
  const url = `${aiaSvcBaseUrl}/wiki?${`page=${params.page}&perpage=${params.pageSize}`}`;
  const res = await requestClient.get<{ data: 知识库[]; total: number; }>(url, {
    withCredentials: true,
  });

  const wikis = [...res.data.map(d => new 知识库VM(d)), ...fakeData]; // List页面的数据，不变化，不需要响应式
  return {data: wikis, total: res.total + fakeData.length};
}

/**
 * 获取Wiki详情
 * 返回一个响应式对象，该对象会根据socket事件自动更新
 */
export async function getWikiDetail(id: string) {
  // 从模拟数据中查找
  let res = fakeData.find(item => item.id === id);
  if (res) {
    return new 知识库VM(res);
  }

  const wikiData = await requestClient.get<知识库>(`${aiaSvcBaseUrl}/wiki/${id}`, {
    withCredentials: true,
  });
  return createAndCacheWiki(wikiData);
}


/**
 * 创建Wiki
 */
export async function createWiki(data: Pick<知识库, '名称' | 'URL' | '类型' | '简介'>) {
  const wikiData = await requestClient.post<知识库>(`${aiaSvcBaseUrl}/wiki/`, data, {
    withCredentials: true,
  });
  return createAndCacheWiki(wikiData);
}

// ['page', 'perpage', 'sortby', 'order', 'sort', 'offset', 'limit']
export interface Pagination {
  page: number; // 当前页码
  pageSize: number; // 每页条数
  // total: number; // 总条数
}

function createAndCacheWiki(wikiData: 知识库) {
  const newWiki = reactive(new 知识库VM(wikiData));
  // 如果是创建中状态，添加到缓存。非creating，状态不会变化了，没必要缓存。
  if (newWiki.status === 'creating') {
    debug(`添加知识库 ${newWiki.id} 到创建缓存`);
    wikiCache.set(newWiki.id, newWiki);
  }
  return newWiki;
}

