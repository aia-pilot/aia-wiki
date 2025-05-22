import { z } from 'zod';


// 定义文档schema
export const 文档Schema = z.object({
  id: z.string().nonempty().describe('文档uuid'),
  title: z.string().nonempty().describe('文档标题'),
  path: z.string().nonempty().describe('在知识库内，相对于根目录的路径')
});

// 定义知识库schema
export const 知识库Schema = z.object({
  // crypto random uuid
  id: z.string().uuid().describe('知识库id'),
  名称: z.string().nonempty().describe('项目、工作等名称'),
  URL: z.string().describe('项目地址, 网上或者本地'),
  类型: z.enum(['开源', '企业', '个人', '其他']).describe('类型'),
  简介: z.string().describe('简介'),
  作者: z.object({
    uid: z.string().nonempty().describe('用户id'),
    username: z.string().nonempty().describe('用户名')
  }),
  生成时间: z.number().int().nonnegative().refine( (timestamp) => !isNaN(new Date(timestamp).getTime()), { message: "必须是有效的Unix时间戳" } ).describe('Unix timestamp'),
  更新时间: z.number().int().nonnegative().refine( (timestamp) => !isNaN(new Date(timestamp).getTime()), { message: "必须是有效的Unix时间戳" } ).describe('Unix timestamp'),
  收藏数: z.number().default(0).describe('收藏数'),
  // 文档目录: z.string().optional().describe('在服务器上Wiki文件的根目录'),
  文档列表: z.array(文档Schema).describe('文档列表'),
  status: z.enum(['creating', 'ready']).describe('创建状态')
});

// 从schema中导出类型
export type 文档 = z.infer<typeof 文档Schema>;
export type 知识库 = z.infer<typeof 知识库Schema>;
//
//
//
// export interface 文档 {
//   id: string; // 文档uuid
//   title: string; // 文档标题
//   path: string; // 在知识库内，相对于根目录的路径
// }
//
// export interface 知识库 {
//   id: string;
//   名称: string; // 项目、工作等名称
//   URL: string; // 项目地址, 网上或者本地
//   类型: '开源' | '企业' | '个人' | '其他'; // 类型
//   简介: string; // 简介
//   作者: {
//     uid: string; // 用户id
//     username: string; // 用户名
//   };
//   生成时间: number; // Unix timestamp
//   更新时间: number; // Unix timestamp
//   收藏数: number; // 收藏数
//   // 文档目录: string; // 在服务器上Wiki文件的根目录
//   文档列表: 文档[]; // 文档列表
//   status: 'creating' | 'ready'; // 创建状态
// }

export class 知识库VM implements 知识库 {
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

const fakeData: 知识库[] = [
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
].map(item => new 知识库VM(item));

/**
 * 根据分页参数，获取Wiki列表
 */
export async function getWikiList(params: Pagination) {
  // return requestClient.get<{ data: 知识库[]; total: number; }>('http://localhost/wiki/', {params});
  return {data: fakeData, total: fakeData.length};
}

/**
 * 获取Wiki详情
 */
export async function getWikiDetail(id: string) {
  // return requestClient.get<知识库>(`http://localhost/wiki/${id}`);
  return fakeData.find(item => item.id === id);
}
