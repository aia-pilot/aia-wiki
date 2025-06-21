## 目标

为`CP（eaog）编辑器`（CPE）增加项目管理功能。一个项目由工作群的一组CP（eaog）文件和其它文件组成。

在CPE中增加`项目`面板，展示当前项目中的子目录和文件，用户可以选择相应Eaog文件编辑。

注意：目前阶段，CPE仅有默认项目，暂不考虑多项目功能。

## 开发计划

1. CPE添加项目面板
     1. 右侧栏：现有`节点详情区域`升级为`右侧栏`, 使用`Vben Tab控件`，包括`节点详情`、`项目面板`两个tab
     2. 文件树：项目面板使用`Vben Tree控件`，展示当前项目的文件组成
2. 添加业务类，管理项目业务状态和交互状态
     1. 示例：仿照`model示例`
     2. 持久化，使用idb库，保存到IndexDB
## 对应文件

* `CP（eaog）编辑器`：apps/web-antd/src/views/cp/editor.vue
* `model示例`：apps/web-antd/src/views/cp/models/editable-eaog-node.ts

## 相关资源

- `Vben Tab控件`：[说明和用法](https://deepwiki.com/search/tabpackagescoreuikitshadcnuisr_9960d3b1-3c13-4ac4-93c3-ce0a305dddda)
- `Vben Tree控件`：[说明和用法](https://deepwiki.com/search/treepackagescoreuikitshadcnuis_bba54763-d0f3-48e3-b0c0-d78778c8e5da)

