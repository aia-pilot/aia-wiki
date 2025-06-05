5. 
5. 

## 开发计划

1. 实现交互逻辑
     1. 导入`EaogNode`，用其渲染来自`eaog-samples`的eaog，并实现节点选择（点击节点选中、高亮突出显示）
     2. 添加节点上下文菜单（右键菜单）功能，包括菜单项：新建、编辑、复制、粘贴、删除，以及必要的二级菜单（插入位置、是否复制子树、是否删除子树）
          1.3 ** 实现要点 **
  - 
  - 
  - 遵循Vben的上下文菜单规范，仿照tabbar.vue中的方式，使用`VbenContextMenu`组件，配合`IContextMenuItem`接口定义菜单项。
   ```ts
     import { VbenContextMenu } from '@vben-core/shadcn-ui';
     import type { IContextMenuItem } from '@vben-core/shadcn-ui';
   ```
  - 使用EaogNode组件，渲染Eaog树形结构和节点。
  - 尽量使用tailwindcss的类名来控制样式，保持一致性和可维护性。
2. 实现业务逻辑
2.1 提供业务类EditableEaogNode类，封装节点的编辑逻辑。
  - 编辑器页面加载时，将EaogNode转换为reactive<EditableEaogNode>，编辑完成后，将EditableEaogNode转换回EaogNode。
  - EditableEaogNode类提供必要的属性和方法，支持节点的编辑、复制、粘贴、删除等操作。
3. 集成完善
3.1 将业务逻辑绑定到上下文菜单上
3.2 完善编辑器页面的UI，提供必要的提示和反馈

## 相关资源
- 图标："@vben/icons"项目提供了丰富的图标资源，可以用于节点类型的图标展示。 @see aia-wiki-new/packages/icons
  可通过 `import { IconName } from '@vben/icons';` 引入所需图标。

