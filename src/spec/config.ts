import { DEV_RESOLVE_ENABLED, DEV_RESOLVE_PATH, GLOBAL_MINI_MODULE_NAME } from '@/core/config'
import { CONFIG_FILE_NAME, MODULE_SEARCH_NAME } from '@/core/config'
import fs from 'fs/promises'
import path from 'path'
import { cloneDeep, get, merge, set } from 'lodash'
import { rewireModuleImport } from './ast'
import { requireFromString } from '@/core/require-utils'

export interface IConfig {
  env: { [key: string]: any }
  cwd: string
  includeShadowDom: boolean
  redirectionLimit: number
  reporter: string
  reporterOptions?: any
  retries: number | { runMode: number; openMode: number }
  watchForFileChanges: boolean
  defaultCommandTimeout: number
  execTimeout: number
  taskTimeout: number
  pageLoadTimeout: number
  requestTimeout: number
  responseTimeout: number
  downloadsFolder: string
  fileServerFolder: string
  fixturesFolder: string
  screenshotsFolder: string
  screenshotOnRunFailure: boolean
  trashAssetsBeforeRuns: boolean
  chromeWebSecurity: boolean
  userAgent?: string | null
  viewportWidth: number
  viewportHeight: number
  e2e: {
    baseUrl: string | null
    supportFile: string
    specPattern: string | string[]
    excludeSpecPattern: string | string[]
    slowTestThreshold: number
  }
}

const DEFAULT_CONFIG_VALUES: IConfig = {
  env: {},
  cwd: './',
  includeShadowDom: true,
  redirectionLimit: 20,
  reporter: 'spring',
  reporterOptions: null,
  retries: { runMode: 0, openMode: 0 },
  watchForFileChanges: true,
  defaultCommandTimeout: 4000,
  execTimeout: 60000,
  taskTimeout: 60000,
  pageLoadTimeout: 60000,
  requestTimeout: 5000,
  responseTimeout: 30000,
  downloadsFolder: `${MODULE_SEARCH_NAME}/downloads`,
  fileServerFolder: ``,
  fixturesFolder: `${MODULE_SEARCH_NAME}/fixtures`,
  screenshotsFolder: `${MODULE_SEARCH_NAME}/screenshots`,
  screenshotOnRunFailure: true,
  trashAssetsBeforeRuns: true,
  chromeWebSecurity: true,
  userAgent: null,
  viewportWidth: 1000,
  viewportHeight: 660,
  e2e: {
    baseUrl: null,
    supportFile: `${MODULE_SEARCH_NAME}/support/e2e.js`,
    specPattern: `${MODULE_SEARCH_NAME}/e2e/**/*.${GLOBAL_MINI_MODULE_NAME}.js`,
    excludeSpecPattern: '*.hot-update.js',
    slowTestThreshold: 10000,
  },
}

export function defineConfig(config: any): any {
  return config
}

function contextualizeConfig(config: IConfig, workingDirectory: string): IConfig {
  const ret = cloneDeep(config)

  ;[
    'downloadsFolder',
    'fileServerFolder',
    'fixturesFolder',
    'screenshotsFolder',
    'cwd',
    'e2e.supportFile',
    'e2e.specPattern',
  ].forEach((keypath) => {
    const relativePath = get(ret, keypath)

    if (path.isAbsolute(relativePath)) {
      return
    }

    set(ret, keypath, path.join(workingDirectory, relativePath))
  })

  return ret
}

export async function parseConfig(workingDirectory: string): Promise<IConfig> {
  if (!(await fs.stat(path.resolve(workingDirectory, CONFIG_FILE_NAME))).isFile()) {
    throw new Error(`${CONFIG_FILE_NAME} not found in working directory`)
  }

  let code = await fs.readFile(path.resolve(workingDirectory, CONFIG_FILE_NAME), 'utf8')

  // We rewire the existing import here so that it uses our API instead of theirs
  if (DEV_RESOLVE_ENABLED) {
    code = rewireModuleImport(code, MODULE_SEARCH_NAME, DEV_RESOLVE_PATH ? path.resolve(DEV_RESOLVE_PATH) : 'spring')
  } else {
    code = rewireModuleImport(code, MODULE_SEARCH_NAME, 'spring')
  }

  return contextualizeConfig(
    merge(DEFAULT_CONFIG_VALUES, requireFromString(code, `${MODULE_SEARCH_NAME}.config.js`)),
    workingDirectory
  )
}
