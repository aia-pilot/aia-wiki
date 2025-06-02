/**
 * 知识库创建进度MCP服务
 * 提供info、progress、warning、error、success等工具消息通知功能
 */

import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {CallToolRequestSchema, ListToolsRequestSchema} from "@modelcontextprotocol/sdk/types.js";
import {z} from "zod";
import {zodToJsonSchema} from "zod-to-json-schema";
import Debug from "debug";
import {reactive, ref, watch} from "vue"; // 导入watch函数
// @ts-ignore
import {AiaClient} from "../../../../../../aia-se-comp/src/aia-server-client/aia-client.js";
import {useUserStore} from "@vben/stores";

const debug = Debug('aia:wiki-progress-server');

// 定义消息类型枚举
export enum MessageType {
  INFO = 'info',
  PROGRESS = 'progress',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
  CONFIRM = 'confirm' // 新增确认类型
}

// 定义消息接口
export interface BaseMessage {
  type?: MessageType;
  message: string;
  data?: any;
}

export interface ProgressData {
  total: number;
  current: number;
}

export interface ConfirmData {
  id?: string;
  result?: boolean; // 用于存储确认结果
  timeout?: number;  // 超时时间(毫秒)
  endTime?: number;  // 超时截止时间戳
}

export interface ProgressMessage extends BaseMessage {
  data?: ProgressData;
}

export interface ConfirmMessage extends BaseMessage {
  data?: ConfirmData;
}

// 定义基础消息Schema
const BaseMessageSchema = z.object({
  message: z.string().describe('消息内容'),
  data: z.any().optional().describe('附加数据（可选）')
});

// 进度消息Schema，扩展自基础消息
const ProgressMessageSchema = BaseMessageSchema.extend({
  data: z.object({
    total: z.number().describe('总步骤数'),
    current: z.number().describe('当前步骤')
  }).optional().describe('进度数据')
});

// 确认消息Schema，扩展自基础消息
const ConfirmMessageSchema = BaseMessageSchema.extend({
  data: z.object({
    id: z.string().optional().describe('消息ID'),
    result: z.boolean().optional().describe('确认结果')
  }).optional().describe('确认数据')
});

// 输出Schema定义
const MessageOutputSchema = z.object({
  success: z.boolean().describe('操作是否成功')
});

// 创建MCP服务器实例
const server = new Server({
  name: "aia-wiki-progress",
  version: "0.1.0",
}, {
  capabilities: {
    tools: {},
  },
});

// 设置工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "info",
        description: "发送信息类型的消息",
        inputSchema: zodToJsonSchema(BaseMessageSchema),
        outputSchema: zodToJsonSchema(MessageOutputSchema),
      },
      {
        name: "progress",
        description: "发送进度类型的消息，通常包含当前进度和总进度",
        inputSchema: zodToJsonSchema(ProgressMessageSchema),
        outputSchema: zodToJsonSchema(MessageOutputSchema),
      },
      {
        name: "warning",
        description: "发送警告类型的消息",
        inputSchema: zodToJsonSchema(BaseMessageSchema),
        outputSchema: zodToJsonSchema(MessageOutputSchema),
      },
      {
        name: "error",
        description: "发送错误类型的消息",
        inputSchema: zodToJsonSchema(BaseMessageSchema),
        outputSchema: zodToJsonSchema(MessageOutputSchema),
      },
      {
        name: "success",
        description: "发送成功类型的消息",
        inputSchema: zodToJsonSchema(BaseMessageSchema),
        outputSchema: zodToJsonSchema(MessageOutputSchema),
      },
      {
        name: "confirm",
        description: "发送确认类型的消息，等待用户确认或取消",
        inputSchema: zodToJsonSchema(ConfirmMessageSchema),
        outputSchema: zodToJsonSchema(z.object({
          success: z.boolean().describe('操作是否成功'),
          choice: z.enum(['继续', '取消']).describe('用户选择的结果'),
        })),
      },
      {
        name: "clearMessages",
        description: "清除所有消息",
        inputSchema: zodToJsonSchema(z.object({})),
        outputSchema: zodToJsonSchema(MessageOutputSchema),
      },
    ],
  };
});

export const progressMessages = reactive<BaseMessage[]>([]); // 用于存储进度消息
// 设置工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const {name, arguments: args} = request.params;

    switch (name) {
      case "info":
      case "progress":
      case "warning":
      case "error":
      case "success":
        const message: BaseMessage = {
          message: "",
          type: name as MessageType,
          ...args
        };
        progressMessages.push(message);
        return {
          content: [{type: "text", text: 'success'}],
          structuredContent: {success: true},
        }
      case "confirm":
        // 为确认消息生成唯一ID（如果没有提供）
        const confirmData = args?.data as ConfirmData | undefined;
        const confirmId = confirmData?.id || `confirm_${Date.now()}`;

        // 设置超时时间，默认1分钟(60000毫秒) 和 MCP协议默认值相同，@see @modelcontextprotocol/sdk/dist/esm/shared/protocol.js
        const DEFAULT_REQUEST_TIMEOUT_MSEC = 60000;

        const timeoutDuration = confirmData?.timeout || DEFAULT_REQUEST_TIMEOUT_MSEC;
        const endTime = Date.now() + timeoutDuration;

        const confirmMessage: ConfirmMessage = reactive({
          message: (args?.message || "请确认操作") as string,
          type: MessageType.CONFIRM,
          data: {
            id: confirmId,
            result: undefined, // 初始设置为undefined
            timeout: timeoutDuration, // 超时时间(毫秒)
            endTime: endTime // 超时截止时间戳
          }
        });
        progressMessages.push(confirmMessage);

        debug(`等待用户确认消息: ${confirmId}, 超时时间: ${timeoutDuration}ms`);

        // 等待用户响应
        return new Promise((resolve) => {
          // 使用Vue的watch函数监听result变化
          const stopWatch = watch(() => confirmMessage.data?.result, (newValue) => {
            // 只有当result从undefined变为有值时触发
            if (newValue !== undefined) {
              debug(`用户确认结果: ${newValue ? '继续' : '取消'}`);
              // 停止监听避免内存泄漏
              stopWatch();
              clearTimeout(timeoutId); // 清除超时定时器
              const choice = newValue ? '继续' : '取消';
              resolve({content: [{type: "text", text: choice}], structuredContent: {success: true, choice}});
            }
          });

          // 设置超时
          const timeoutId = setTimeout(() => {
            stopWatch(); // 停止监听
            debug(`确认消息超时: ${confirmId}`);
            // 设置超时结果
            if (confirmMessage.data) {
              confirmMessage.data.result = false;
            }
            resolve({content: [{type: "text", text: '超时未确认'}], structuredContent: {success: false, choice: '取消'}});
          }, timeoutDuration);
        });
      case "clearMessages":
        progressMessages.splice(0, progressMessages.length); // 清除所有消息
        return {success: true};
      default:
        throw new Error(`未知工具: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug(`错误: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  }
});

// 定义MCP服务接口
export interface WikiProgressService {
  server: typeof server;
}

/**
 * 运行Wiki进度MCP服务
 * @param {...any} args 其他参数
 * @returns {Promise<Object>} 返回服务器实例
 */
async function runServer(...args: any[]): Promise<{
  server: typeof server;
  service: WikiProgressService;
}> {
  try {
    // 连接到传输层
    const transport = args.slice(-1)[0] // 获取 MCP传输层实例
    await server.connect(transport);
    debug("Wiki进度MCP服务器已启动");

    const wikiProgressService: WikiProgressService = {
      server
    };

    return {
      server,
      service: wikiProgressService
    };
  } catch (error: any) {
    debug("启动Wiki进度MCP服务器时出错:", error.message);
    throw error;
  }
}

// MCP配置定义
interface MCPConfig {
  name: string;
  runServer: (transport: any) => Promise<any>;
  args: any[];
  toolsConfig: any[];
  serverProtocol: string;
}

const mcpConfigs: MCPConfig[] = [{
  name: "aia-wiki-progress",
  runServer,
  args: [{}],
  toolsConfig: [],
  serverProtocol: "emcp",
}];

export const isConnected = ref<boolean>(false); // 用于跟踪连接状态
const aiaClient = new AiaClient(mcpConfigs, {
  onConnected: () => {
    isConnected.value = true; // 更新连接状态
    debug("--- Wiki Progress MCP Server已连接 ---");
  },
  onDisconnect: () => {
    isConnected.value = false; // 更新连接状态
    debug("--- Wiki Progress MCP Server已断开连接 ---");
  }
});

const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠
export const start = async (): Promise<void> => {
  if (!isConnected.value) {
    const userStore = useUserStore();
    await aiaClient.connect(aiaSvcBaseUrl, userStore.userInfo?.id, userStore.userInfo?.aiaClientBindToken)
      .catch((error: { message: string }) => {
        debug("连接Aia Server时出错:", error.message);
      });
  }
}

export const stop = async (): Promise<void> => {
  await aiaClient.close();
}
