import { determineBrowserType } from '@/util/args'
import { parseConfig } from '@/spec/config'
import { CONFIG_FILE_NAME } from '@/core/config'
import { Runner } from '@/spec/runner'

export interface IRunOptions {
  browser?: any
  workingDirectory?: any
}

export async function runCommand({ browser, workingDirectory = process.cwd() }: IRunOptions): Promise<void> {
  const browserType = determineBrowserType(browser)
  if (!browserType) {
    throw new Error(`Unsupported browser type '${browser}'`)
  }

  const config = await parseConfig(workingDirectory)
  if (!config) {
    throw new Error(`Failed to parse config file ${CONFIG_FILE_NAME}`)
  }

  const runner = new Runner(browserType, workingDirectory, config)
  await runner.initializeGlobalRunnerEnvironment()

  const success = await runner.runSpecs()

  if (!success) {
    process.exit(1)
  }
}
