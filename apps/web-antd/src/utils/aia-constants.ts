// @ts-ignore
export const IS_STANDALONE_APP = !!window?.electronAPI

export const IS_WEB_APP = !IS_STANDALONE_APP

export const IS_DEV = import.meta.env.DEV
