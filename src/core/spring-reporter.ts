import { green, red, grey, black, bold, underline, bgGreen, bgRed, greenBright, redBright } from 'chalk'
import { reporters, Suite, Test } from 'mocha'
import { RunnerEvents } from '@/spec/event'
import { ISpecFile } from '@/spec/model'
import { IRunnerEnvironment } from '@/spec/runner-environment'
import { SPRING_VERSION } from '@/core/config'
import dayjs from 'dayjs'
import { ILogEntry, LogLevel } from './log'

const LOG_INDENT = '  '

/**
 * Mimics the other project's command line reporter.
 * This is a big ball of jank due to us not using a nice CLI display library yet, but it works.
 */
export default class SpringReporter extends reporters.Base {
  _indent = 1
  _fileStart = new Date()
  _filePasses = 0
  _fileFailures = 0
  _filePending = 0
  _testEvents: ILogEntry[] = []

  constructor(runner: Mocha.Runner, options: any) {
    super(runner, options)
    runner.on(RunnerEvents.EVENT_RUN_BEGIN, this.handleRunBegin.bind(this))
    runner.on(RunnerEvents.EVENT_RUN_END, this.handleRunEnd.bind(this))
    runner.on(RunnerEvents.EVENT_FILE_BEGIN, this.handleFileBegin.bind(this))
    runner.on(RunnerEvents.EVENT_FILE_END, this.handleFileEnd.bind(this))
    runner.on(RunnerEvents.EVENT_SUITE_BEGIN, this.handleSuiteBegin.bind(this))
    runner.on(RunnerEvents.EVENT_SUITE_END, this.handleSuiteEnd.bind(this))
    runner.on(RunnerEvents.EVENT_TEST_END, this.handleTestEnd.bind(this))
    runner.on(RunnerEvents.EVENT_TEST_FAIL, this.handleTestFail.bind(this))
    runner.on(RunnerEvents.EVENT_TEST_PASS, this.handleTestPass.bind(this))
    runner.on(RunnerEvents.EVENT_TEST_PENDING, this.handleTestPending.bind(this))
    runner.on(RunnerEvents.EVENT_TEST_RETRY, this.handleTestRetry.bind(this))
    runner.on(RunnerEvents.EVENT_TEST_EVENT, this.handleTestEvent.bind(this))
  }

  private handleRunBegin() {
    this.logHeader()
    this.logSectionHeader('Run Starting')

    const env = this.runner as unknown as IRunnerEnvironment
    const stats = env.browser.stats

    this.logBoxHeader()
    this.logField('Spring:'.padEnd(16), SPRING_VERSION)
    this.logField('Browser:'.padEnd(16), `${stats.name} ${stats.version}`, stats.headless ? 'headless' : undefined)
    this.logField('Node Version:'.padEnd(16), process.version, process.execPath)
    this.logField('Specs:'.padEnd(16), `${this.runner.suite.suites.length} found`)
    this.logField(
      'Searched:'.padEnd(16),
      typeof env.config.e2e.specPattern === 'string'
        ? env.config.e2e.specPattern.replace(env.config.cwd, '')
        : env.config.e2e.specPattern.map((p) => p.replace(env.config.cwd, '')).join(', ')
    )
    this.logBoxFooter()
  }

  private handleRunEnd() {
    this.logFooter()
    this.logSectionHeader('Run Finished')
    console.log('\n\n')
  }

  private handleFileBegin(file: ISpecFile, fileIndex: number, fileCount: number) {
    this._fileStart = new Date()
    this.logSeparator()
    this.logFile(file.name, fileIndex, fileCount)
  }

  private handleFileEnd(file: ISpecFile, _fileIndex: number, _fileCount: number) {
    let summary = '\n' + new Array(this._indent + 1).join(LOG_INDENT)

    if (this._filePasses > 0) {
      summary += green(`${this._filePasses} passing `)
    }

    if (this._fileFailures > 0) {
      summary += red(`${this._fileFailures} failing `)
    }

    if (this._filePending > 0) {
      summary += grey(`${this._filePending} pending `)
    }

    const fileEnd = new Date()
    const duration = dayjs(fileEnd).diff(dayjs(this._fileStart))
    const relativeDuration = dayjs(fileEnd).diff(dayjs(this._fileStart), 'seconds')

    summary += grey(`(${duration}ms)`)

    console.log(summary)

    console.log('\n')

    const logHeader =
      this._fileFailures == 0 ? this.logGreenSectionHeader.bind(this) : this.logRedSectionHeader.bind(this)
    const logField = this._fileFailures == 0 ? this.logGreenField.bind(this) : this.logRedField.bind(this)

    logHeader('Results')
    this.logBoxHeader()
    logField('Tests:'.padEnd(16), `${this.runner.stats?.tests ?? 0}`)
    logField('Passing:'.padEnd(16), `${this._filePasses}`)
    logField('Failing:'.padEnd(16), `${this._fileFailures}`)
    logField('Pending:'.padEnd(16), `${this._filePending}`)
    logField('Screenshots:'.padEnd(16), `0`)
    logField('Duration:'.padEnd(16), `${relativeDuration} seconds`)
    logField('Spec Ran:'.padEnd(16), file.name)
    this.logBoxFooter()

    this._filePasses = 0
    this._fileFailures = 0
    this._filePending = 0
  }

  private handleSuiteBegin(suite: Suite) {
    console.log(new Array(this._indent + 1).join(LOG_INDENT) + suite.title)
    this._indent++
  }

  private handleSuiteEnd(suite: Suite) {
    this._indent--
  }

  private handleTestEnd() {
    const indent = this._indent + 1
    const padding = new Array(indent).join(LOG_INDENT)

    this._testEvents.forEach((eventInfo) => {
      switch (eventInfo.level) {
        case LogLevel.Info:
          console.log(
            `\n${padding} ${eventInfo.event} ${grey(eventInfo.subject || '')} ${grey(eventInfo.detail || '')}`
          )
          break
        case LogLevel.Success:
          console.log(`\n${padding} ${eventInfo.event} ${grey(eventInfo.subject || '')}`)
          console.log(
            `${padding} ${green('-')} ${bold(bgGreen(black('assert')))} ${green(
              `expected ${greenBright(eventInfo.subject || '')} to match assertion ${greenBright(eventInfo.detail)}`
            )}`
          )
          break
        case LogLevel.Error:
          console.log(`\n${padding} ${eventInfo.event} ${grey(eventInfo.subject || '')}`)
          console.log(
            `${padding} ${red(`-`)} ${bold(bgRed(black('assert')))} ${red(
              `expected ${redBright(eventInfo.subject || '')} to match assertion ${redBright(eventInfo.detail)}`
            )}`
          )
          break
      }
    })

    this._testEvents = []
    console.log('\n')
  }

  private handleTestFail(test: Test, error: Error) {
    this._fileFailures++
    const indent = this._indent + 1
    const padding = new Array(indent).join(LOG_INDENT)

    console.log(`${padding}${red('x')} ${grey(test.title)} ${grey(`(${test.duration || 0}ms)`)}`)
    console.log(red(`${padding}${LOG_INDENT}${error.message}`))
  }

  private handleTestPass(test: Test) {
    this._filePasses++
    const indent = this._indent + 1
    const padding = new Array(indent).join(LOG_INDENT)

    console.log(`${padding}${green('✓')} ${grey(test.title)} ${grey(`(${test.duration || 0}ms)`)}`)
  }

  private handleTestPending(test: Test) {
    this._filePending++
    const indent = this._indent + 1
    const padding = new Array(indent).join(LOG_INDENT)
  }

  private handleTestRetry(test: Test, error: Error) {
    const indent = this._indent + 1
    const padding = new Array(indent).join(LOG_INDENT)

    console.log(
      `${padding}${red('x')} ${test.title} ${grey(`(${test.duration || 0}ms)`)} ${grey(
        `(attempt ${test.retries() + 1})`
      )}`
    )
    console.log(red(`${padding}${LOG_INDENT}${grey(error.message)}`))
  }

  private handleTestEvent(info: ILogEntry) {
    this._testEvents.push(info)
  }

  private logHeader() {
    console.log(
      grey(`====================================================================================================\n`)
    )
  }

  private logFooter() {
    console.log(
      grey(`\n====================================================================================================\n`)
    )
  }

  private logSeparator() {
    console.log(
      grey(`\n────────────────────────────────────────────────────────────────────────────────────────────────────\n`)
    )
  }

  private logSectionHeader(text: string) {
    console.log(LOG_INDENT + '(' + bold(underline(`${text}`)) + ')')
  }

  private logGreenSectionHeader(text: string) {
    console.log(green(LOG_INDENT + '(' + bold(underline(`${text}`)) + ')'))
  }

  private logRedSectionHeader(text: string) {
    console.log(red(LOG_INDENT + '(' + bold(underline(`${text}`)) + ')'))
  }

  private logFile(file: string, fileIndex: number, fileCount: number) {
    const left = LOG_INDENT + 'Running:' + LOG_INDENT + grey(file)
    const right = grey(`(${fileIndex + 1} of ${fileCount})`)
    let padding = 100 - `${LOG_INDENT}Running:${LOG_INDENT}${file}(${fileIndex + 1} of ${fileCount})`.length

    if (padding < 0) {
      padding = 0
    }
    padding += 1

    console.log(left + Array(padding).join(' ') + right + '\n')
  }

  private logBoxHeader() {
    console.log(
      grey(`\n  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐`)
    )
  }

  private logField(name: string, val: string, addendum?: string) {
    const value = val.substring(0, 76)
    const raw = `  │ ${name} ${value}${addendum ? ` (${addendum})` : ''} │`
    let padding = 100 - raw.length

    if (padding < 0) {
      padding = 0
    }
    padding += 1
    const paddingText = Array(padding).join(' ')
    console.log(
      `${grey(`  │ ${name}`)} ${value}${grey(addendum ? ` (${addendum})${paddingText} │` : `${paddingText} │`)}`
    )
  }

  private logGreenField(name: string, val: string, addendum?: string) {
    const value = val.substring(0, 76)
    const raw = `  │ ${name} ${value}${addendum ? ` (${addendum})` : ''} │`
    let padding = 100 - raw.length

    if (padding < 0) {
      padding = 0
    }
    padding += 1
    const paddingText = Array(padding).join(' ')
    console.log(
      `${grey(`  │ ${name}`)} ${green(value)}${grey(addendum ? ` (${addendum})${paddingText} │` : `${paddingText} │`)}`
    )
  }

  private logRedField(name: string, val: string, addendum?: string) {
    const value = val.substring(0, 76)
    const raw = `  │ ${name} ${value}${addendum ? ` (${addendum})` : ''} │`
    let padding = 100 - raw.length

    if (padding < 0) {
      padding = 0
    }
    padding += 1
    const paddingText = Array(padding).join(' ')
    console.log(
      `${grey(`  │ ${name}`)} ${red(value)}${grey(addendum ? ` (${addendum})${paddingText} │` : `${paddingText} │`)}`
    )
  }

  private logBoxFooter() {
    console.log(
      grey(`  └────────────────────────────────────────────────────────────────────────────────────────────────┘`)
    )
  }
}
