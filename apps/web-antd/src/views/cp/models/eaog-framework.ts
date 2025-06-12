import {type EaogNode, EditableEaogNode} from "./eaog-node";
// @ts-ignore 忽略导入的类型
import {eaogFrameworks as eaogFrameworkDefs} from "../../../../../../../aia-se-comp/src/framework-store/eaog-frameworks.js";

/**
 * Eaog Framework预定义了一定的执行结构，可以包装、装饰、结构化组装已有的行为（lc、cp、mcp、……）。
 * 例如：report.ef 包装一个action，在执行后，发送报告；
 *      contro.ef，包装action，在执行前，需要先获得授权。
 * 又如：cot.ef 包装实现COT，向用户报告思考结果、获得用户授权、执行计划步骤，甚至反思、改变思路等等。
 *
 * EF是扩展的eaog，增加了节点：
 * 1. Mount Point（mount-point）：与使用Eaog的装配对接点。1..* 个。可以出现在Eaog Framework Tree的任何位置。
 * 2. ……
 */
class EaogFramework extends EditableEaogNode {
  constructor(root: EaogNode) {
    super(root);
    if (!this.isRoot && !this.isLeaf) throw new Error("Root node is required to create an EaogFramework");
    if (!this.meta?.framework) throw new Error("EaogFramework root node must have meta.framework set to true.");
    if (this.descendants.some(d => d.meta?.framework)) throw new Error("EaogFramework root node cannot have descendants with meta.framework set to true.");
  }

  get mountPoints(): EditableEaogNode[] {
    return Array.from(this.descendants)
      .filter(node => node.type === 'mount-point');
  }

  get isMounted(): boolean {
    return this.mountPoints.length === 0 // mounted之后mountPoint Node会被替换为Eaog Node。
  }

  /**
   * 装配Eaog与Eaog Framework。
   * @param {{mountPointName: string, nodeWillMount: EditableEaogNode}} mountPointMap - nodeWillMount将被装配到mountPointName对应的mountPint。
   */
  mountEaogs(mountPointMap: Map<string, EditableEaogNode>) {
    if (this.isMountPointsMatch(mountPointMap)) {
      throw new Error("Mount points do not match the existing mount points in the framework.");
    }
    for (const [name, node] of mountPointMap.entries()) {
      const mountPoint = this.mountPoints.find(mp => mp.name === name);
      mountPoint && this.mountNode(node, mountPoint);
    }
  }

  /**
   * 装配单个Eaog到指定的mount point。
   * @param {EditableEaogNode} nodeWillMount - 将被装配的Eaog节点。
   * @param {string} [mountPointName] - 可选的mount point名称。如果未提供，将使用唯一的mount point。
   */
  mountEaog(nodeWillMount: EditableEaogNode, mountPointName?: string) {
    const mountPoint = this.mountPoints.find(mp => mp.name === mountPointName) ||
      (mountPointName ? null : this.mountPoints.length === 1 ? this.mountPoints[0] : null);
    if (!mountPoint) {
      throw new Error(`Mount point '${mountPointName}' not found or no mount points available.`);
    }
    this.mountNode(nodeWillMount, mountPoint);
  }

  get mountedNodes(): EditableEaogNode[] {
    return this.descendants.filter(node => node.meta?.mountBy?.framework === this.name);
  }

  get mountedNode(): EditableEaogNode | null {
    const mountedNodes = this.mountedNodes;
    if (mountedNodes.length !== 1)  {
      throw new Error(`Expected exactly one mounted node, but found ${mountedNodes.length}.`);
    }
    return mountedNodes[0];
  }

  /**
   * 将Framework应用到指定的Eaog节点上。即：Eaog节点挂载到Framework上，然后再替换回去。
   * @param {EditableEaogNode} eaog - 要应用的Eaog节点。
   * @return {EaogFramework} 返回新的EaogFramework实例，包含已挂载的Eaog节点，且已经替换到原Eaog节点位置。
   * TODO: 目前只有一个mount point，后续可能会有多个mount point
   */
  applyToEaog(eaog: EditableEaogNode) {
    const framework = this.cloneDeep(); // 克隆一个新的EaogFramework实例，避免修改原始实例。Framework总是一次性消费的。
    const placeholder = eaog.replaceWithPlaceHolder(); // 替换下来，记住位置
    framework.mountEaog(eaog)
    placeholder.replaceWith(framework)
    return framework;
  }

  private isMountPointsMatch(mountPointMap: any) {
    return mountPointMap.size !== this.mountPoints.length &&
            !this.mountPoints.every(mp => mountPointMap.has(mp.name));
  }

  private mountNode(node: EditableEaogNode, mountPoint: EditableEaogNode) {
    if (this.isMounted) {
      throw new Error("EaogFramework is already mounted. Cannot mount more nodes.");
    }
    // 将所有nodes的name中存在形如："控制：${mountPointName}" 替换为 `控制：mountNodeName`，让节点名称更加清晰。
    const nameReplaceRegex = new RegExp('\\${' + mountPoint.name + '}', 'g');
    [this, ...this.descendants].forEach(n => {
      n.name = n.name.replace(nameReplaceRegex, node.name);
    })

    // 挂载节点到mountPoint。
    node.isRoot || node.remove();
    mountPoint.replaceWith(node);

    // 如果mountPoint有choice，则将其传递给node。
    if (mountPoint.choice) {
      node.choice = mountPoint.choice;
    }

    // 在node上添加元数据，标记它是由Eaog Framework装配的。
    const meta = {mountBy: {framework: this.name, mountPointName: mountPoint.name}};
    node.meta = Object.assign({}, node.meta, meta); // 合并元数据，保留原有的meta信息
  }
}

export const eaogFrameworks = eaogFrameworkDefs.map(def => new EaogFramework(def));


