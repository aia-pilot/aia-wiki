/**
 * Vben在使用class来声明图标时，其图标类名是以`icon-`开头的，且provider和iconClass的分隔符是`--`。
 * 不同于其图标选择器给回的Iconify格式，provider:iconClass。
 * @see https://deepwiki.com/search/vbenclassiconprovidericonclass_e612fd96-cf74-492d-baa4-db3c59847a28
 */

/**
 * 将 Iconify格式 provider:iconClass 转换为 icon-[provider--iconClass] (Vben Class Name)
 */
export function iconify2Class(iconString: string): string {
  const [provider, iconClass] = iconString.trim().split(':');
  if (!provider || !iconClass) {
    throw new Error(`Invalid icon string format: ${iconString}. Expected format is 'provider:iconClass'.`);
  }
  return `icon-[${provider}--${iconClass}]`;
}

/**
 * 将 Vben Class Name icon-[provider--iconClass] 转换为  provider:iconClass (Iconify格式)
 */
export function class2Iconify(className: string): string {
  const match = className.trim().match(/^icon-\[(.+?)--(.+?)]$/);
  if (!match) {
    throw new Error(`Invalid class name format: ${className}. Expected format is 'icon-[provider--iconClass]'.`);
  }
  const [, provider, iconClass] = match;
  return `${provider}:${iconClass}`;
}
