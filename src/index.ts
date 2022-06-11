import chalk from 'chalk'
import { Command } from 'commander'
import { envCommand } from './commands/env'
import { runCommand } from './commands/run'
import { defineConfig } from './spec/config'

export { defineConfig }

export function runCli() {
  const program = new Command('spring')

  program
    .command('env')
    .description('Prints information about your environment')
    .option('-b, --browser <chrome|firefox>', 'Your browser of choice', 'chrome')
    .action(async ({ browser }) => {
      try {
        await envCommand(browser)
      } catch (err) {
        console.error(chalk.red(typeof err === 'string' ? err : (err as Error).message))
        console.log('\n')
        program.outputHelp()
      }
    })

  program
    .command('run')
    .description('Runs a test suite in the current working directory')
    .option('-b, --browser <chrome|firefox>', 'Your browser of choice', 'chrome')
    .option(
      '-wd, --working-directory <path/to/project/root>',
      "Override the working directory if it's different from the cwd"
    )
    .action(async ({ browser, workingDirectory }) => {
      try {
        await runCommand({ browser, workingDirectory })
      } catch (err) {
        console.error(chalk.red(typeof err === 'string' ? err : (err as Error).message))
        console.log('\n')
        program.outputHelp()
        return process.exit(1)
      }

      process.exit(0)
    })

  program.addHelpCommand()

  program.parse()
}
