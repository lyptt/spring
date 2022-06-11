export const DEV_SHOW_BROWSER = !!process.env.DEV_SHOW_BROWSER
export const DEV_RESOLVE_ENABLED = !!process.env.DEV_RESOLVE
export const DEV_RESOLVE_PATH = process.env.DEV_RESOLVE
export const MODULE_SEARCH_NAME = process.env.MODULE_SEARCH_NAME ?? 'spring'
export const GLOBAL_MODULE_NAME = process.env.GLOBAL_MODULE_NAME ?? 'Spring'
export const GLOBAL_MINI_MODULE_NAME = process.env.GLOBAL_MINI_MODULE_NAME ?? 'sp'
export const CONFIG_FILE_NAME = `${MODULE_SEARCH_NAME}.config.js`
export const SPRING_VERSION = '0.0.0'
