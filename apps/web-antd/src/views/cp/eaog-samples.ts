/**
 * EAOG示例用例集
 * 用于驱动CP可视化组件的开发
 */
import type {EaogNode} from "#/views/cp/components/eaog-node";

// 示例1: 简单的顺序执行流程
export const simpleSequentialFlow: EaogNode = {
  type: "sand",
  name: "生成文档摘要",
  description: "顺序地执行文档摘要生成流程",
  children: [
    {
      type: "instruction",
      name: "加载文档",
      description: "从文件系统加载文档内容"
    },
    {
      type: "instruction",
      name: "分析文档结构",
      description: "分析文档的标题、段落结构等"
    },
    {
      type: "instruction",
      name: "生成摘要",
      description: "基于文档结构生成摘要"
    }
  ]
};

// 示例2: 包含并行和条件分支的复杂流程
export const complexFlow: EaogNode = {
  type: "sand",
  name: "生成项目知识库",
  description: "顺序：生成项目知识库（README + Wiki）",
  children: [
    {
      type: "instruction",
      name: "扫描项目文件",
      description: "调用git_files，扫描项目目录及其子孙目录，找出所有项目源文件集"
    },
    {
      type: "sand",
      name: "生成README",
      description: "顺序：生成README",
      children: [
        {
          type: "instruction",
          name: "获取README文件路径",
          description: "调用获取README文件路径，获取README文件路径"
        },
        {
          type: "cor",
          name: "README是否存在",
          description: "条件：README文件是否存在",
          children: [
            {
              type: "sand",
              name: "存在",
              description: "存在，读取内容",
              children: [
                {
                  type: "instruction",
                  name: "读取README",
                  description: "调用read_file，读取README内容",
                  params: {path: "README文件路径"},
                  results: {content: "README内容"}
                }
              ]
            },
            {
              type: "sand",
              name: "不存在",
              description: "不存在，创建README",
              children: [
                {
                  type: "instruction",
                  name: "生成README",
                  description: "调用生成README，生成README"
                },
                {
                  type: "instruction",
                  name: "写入README",
                  description: "调用write_file，输出README为README.md"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "sand",
      name: "生成Wiki",
      description: "顺序：生成Wiki",
      children: [
        {
          type: "instruction",
          name: "生成知识库综述",
          description: "调用生成知识库综述，生成知识库综述"
        },
        {
          type: "instruction",
          name: "生成知识库大纲",
          description: "调用生成知识库大纲，生成知识库大纲"
        },
        {
          type: "pfor",
          name: "遍历章节生成内容",
          description: "遍历知识库大纲，逐个章节生成对应的内容",
          items: '章节列表',
          item: '章节',
          children: [
            {
              type: "instruction",
              name: "生成知识库章节",
              description: "调用生成知识库章节，生成章节内容"
            },
            {
              type: "sand",
              name: "后处理章节内容",
              description: "后处理章节内容",
              children: [
                {
                  type: "instruction",
                  name: "修正文件路径",
                  description: "调用修正章节内容内的文件路径函数"
                },
                {
                  type: "instruction",
                  name: "修正Mermaid图",
                  description: "调用修正章节内容内的Mermaid图语法错误函数"
                },
                {
                  type: "instruction",
                  name: "写入Wiki文件",
                  description: "调用write_file，输出章节内容到指定Wiki文件"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// 示例3: 包含递归和迭代的高级流程
export const advancedFlow: EaogNode = {
  type: "sand",
  name: "网站爬虫与分析",
  description: "爬取网站内容并进行分析",
  children: [
    {
      type: "instruction",
      name: "初始化爬虫",
      description: "设置爬虫参数和初始URL"
    },
    {
      type: "sitr",
      name: "按层次爬取",
      description: "按网站层次结构依次爬取",
      children: [
        {
          type: "sand",
          name: "爬取单个层次",
          description: "爬取单个层次的所有页面",
          children: [
            {
              type: "instruction",
              name: "获取URL列表",
              description: "获取当前层次的所有URL"
            },
            {
              type: "pfor",
              name: "并行爬取页面",
              description: "并行爬取当前层次的所有页面",
              children: [
                {
                  type: "instruction",
                  name: "下载页面",
                  description: "下载单个页面内容"
                },
                {
                  type: "instruction",
                  name: "解析页面",
                  description: "解析页面内容和链接"
                },
                {
                  type: "instruction",
                  name: "存储页面数据",
                  description: "将页面数据存储到数据库"
                }
              ]
            },
            {
              type: "instruction",
              name: "收集下一层URL",
              description: "从当前层次页面中收集下一层次的URL"
            }
          ]
        }
      ]
    },
    {
      type: "cor",
      name: "分析类型选择",
      description: "根据参数选择不同的分析方式",
      children: [
        {
          type: "sand",
          name: "内容分析",
          description: "分析网站内容",
          children: [
            {
              type: "instruction",
              name: "提取关键词",
              description: "从页面内容中提取关键词"
            },
            {
              type: "instruction",
              name: "生成内容摘要",
              description: "为每个页面生成内容摘要"
            }
          ]
        },
        {
          type: "sand",
          name: "结构分析",
          description: "分析网站结构",
          children: [
            {
              type: "instruction",
              name: "构建网站地图",
              description: "构建完整的网站结构图"
            },
            {
              type: "instruction",
              name: "分析导航路径",
              description: "分析网站的主要导航路径"
            }
          ]
        },
        {
          type: "pand",
          name: "综合分析",
          description: "同时进行内容和结构分析",
          children: [
            {
              type: "recursion",
              name: "递归内容分析",
              ref: "内容分析",
              description: "递归调用内容分析"
            },
            {
              type: "recursion",
              name: "递归结构分析",
              ref: "结构分析",
              description: "递归调用结构分析"
            }
          ]
        }
      ]
    },
    {
      type: "instruction",
      name: "生成分析报告",
      description: "根据分析结果生成最终报告"
    }
  ]
};
