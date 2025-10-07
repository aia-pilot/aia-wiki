import {CPMSession, createCPM} from '../../../../../../../aia-cpm-old';
import {type CPId, IntegrationManager} from 'aia-ect-integration';
import {EditableCP} from '../models/ect/editable-cp';

/**
 * 管理EditableCP实例
 * 1. 利用cpm(createCPM():CPMSession)，一个CP（两个文件xxx.cp.js, xxx.cp.ehc.js）对应一个会话，从文件加载和保存CP
 * 2. 按cpId(name, version)缓存多个EditableCP实例，供UI选择
 * 3. 利用IntegrationManager，加载xxx.cp.js时，生成集成点，加载集成CP（辅程，side, hook, use, action），并进而按depth递归生成、加载辅程集成
 *
 * CP由两种来源：
 * 1. 本地文件：用户从本地（File Access API）选择xxx.cp.js
 * 2. 远程仓库：集成点的cpLocateStr（cp://name#version）在workspace中没有找到时，从aia-svc的
 */



async function loadCP(filePath: string) {
  //
  if (filePath.startsWith('cp://')) {
    filePath = filePath.slice(5); // 去掉前缀cp://
    const names = filePath.split('/'); // 支持多级CP
    const name = names[names.length - 1]!; // 最后一个是CP名称
    filePath = `${filePath}/${name}.cp.js`; // 转换为相对路径
  }

  if (filePath.startsWith('cp-store/')) {
    filePath = filePath.slice(9); // 去掉前缀cp-store/
  }

  // TODO: use File Access API to load file from local disk
  const cp = await import(/* @vite-ignore */ `${aiaSvcBaseUrl}/cp-store/${filePath}?t=${Date.now()}`); // 加上时间戳，每次都更新
  return {cp, filePath};
}

class CPEditSession {
  filePath: string;
  sessions: Map<CPId, CPMSession>;
  depth: number;
  CPs: EditableCP[];
  integrationManager: IntegrationManager;

  constructor(filePath: string, depth: number) {
    this.filePath = filePath;
    this.sessions = new Map();
    this.depth = depth;
    this.CPs = [];
    this.integrationManager = new IntegrationManager();
  }

  get rootSession() {
    return this.sessions.entries().find(([_, s]) => s.)?.[1];
  }
};

const cpCache = new Map<CPId, CPEditSession>();

async function loadCpFromFile(filePath: string, depth: number) {
  const session = createCPM();
  const res = await session.loadCP(filePath);
}
