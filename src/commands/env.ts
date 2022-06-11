import { determineBrowserType } from '@/util/args'
import { detectBrowserPath } from '@/util/detect-browser'
import chalk from 'chalk'
import os from 'os'

export async function envCommand(browser: any): Promise<void> {
  const type = determineBrowserType(browser)

  if (!type) {
    throw new Error(`Invalid browser type '${browser}'`)
  }

  const path = await detectBrowserPath(type)

  console.log(chalk.bold(chalk.green('Spring\n')))
  console.log(`${chalk.bold(chalk.blue('OS:'))} ${os.platform()}`)
  console.log(`${chalk.bold(chalk.blue('Browser Path:'))} ${path}`)
}
