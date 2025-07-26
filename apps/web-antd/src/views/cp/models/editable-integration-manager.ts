import type {IntegrationPoint, IntegrationType, EaogNode} from './types.d';
// @ts-ignore
import {IntegrationPointSchema, z} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog.zod.js";
import {CPIntegrationManager} from "../../../../../../../aia-se-comp/src/eaog/cp-integration-manager.js";
/**
 * 可编辑的集成管理器，继承自CPIntegrationManager
 * 提供针对节点的集成点操作方法
 */
// @ts-ignore
export class EditableIntegrationManager extends CPIntegrationManager {
  /**
   * 检查节点是否存在指定类型的集成点
   * @param node 要检查的节点
   * @param type 可选的集成点类型
   * @returns 是否存在集成点
   */
  has(node: EaogNode, type?: IntegrationType): boolean {
    if (!node.ipath) {
      return false;
    }

    if (type) {
      return this.integrations.some(integration =>
        integration.ipath?.startsWith(node.ipath as string) && integration.type === type
      );
    } else {
      return this.integrations.some(integration =>
        integration.ipath?.startsWith(node.ipath as string)
      );
    }
  }

  /**
   * 获取节点上的集成点
   * @param node 要获取集成点的节点
   * @param type 可选的集成点类型
   * @returns 符合条件的集成点数组
   */
  get(node: EaogNode, type?: IntegrationType): IntegrationPoint[] {
    if (!node.ipath) {
      return [];
    }

    if (type) {
      return this.integrations.filter(integration =>
        integration.ipath?.startsWith(node.ipath as string) && integration.type === type
      );
    } else {
      return this.integrations.filter(integration =>
        integration.ipath?.startsWith(node.ipath as string)
      );
    }
  }

  /**
   * 添加集成点
   * @param integrationPoint 要添加的集成点
   * @returns 添加后的集成点
   */
  add(integrationPoint: IntegrationPoint): IntegrationPoint {
    try {
      // 使用zod验证集成点格式
      const validatedPoint = IntegrationPointSchema.parse(integrationPoint);

      // 避免重复添加
      const existingIndex = this.integrations.findIndex(i =>
        i.ipath === integrationPoint.ipath && i.type === integrationPoint.type
      );

      if (existingIndex >= 0) {
        this.integrations[existingIndex] = validatedPoint;
      } else {
        this.integrations.push(validatedPoint);
      }

      return validatedPoint;
} catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error(`集成点验证失败: ${(error as z.ZodError).errors.map((e: { message: string }) => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * 移除集成点
   * @param integrationPoint 要移除的集成点
   * @returns 是否成功移除
   */
  remove(integrationPoint: IntegrationPoint): boolean {
    const initialLength = this.integrations.length;

    this.integrations = this.integrations.filter(integration => {
      // 通过ipath和type确定唯一的集成点
      return !(integration.ipath === integrationPoint.ipath &&
              integration.type === integrationPoint.type &&
              integration.id === integrationPoint.id);
    });

    return initialLength > this.integrations.length;
  }

  /**
   * 根据节点和类型移除集成点
   * @param node 相关节点
   * @param type 可选的集成点类型
   * @returns 移除的集成点数量
   */
  removeByNode(node: EaogNode, type?: IntegrationType): number {
    if (!node.ipath) {
      return 0;
    }

    const initialLength = this.integrations.length;

    if (type) {
      this.integrations = this.integrations.filter(integration =>
        !(integration.ipath?.startsWith(node.ipath as string) && integration.type === type)
      );
    } else {
      this.integrations = this.integrations.filter(integration =>
        !integration.ipath?.startsWith(node.ipath as string)
      );
    }

    return initialLength - this.integrations.length;
  }
}

