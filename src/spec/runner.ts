import { flatten } from 'lodash'
import { promisify } from 'util'
import { basename } from 'path'
import { GLOBAL_MINI_MODULE_NAME, GLOBAL_MODULE_NAME } from '@/core/config'
import { BrowserType } from '@/spec/browser-type'
import { CommandRegistry } from '@/spec/command-registry'
import { IConfig } from '@/spec/config'
import { ISpecFile } from '@/spec/model'
import { optionalRequire } from '@/core/require-utils'
import { glob } from 'glob'
import { SpecInvocation, SpecRunResult } from './spec-invocation'
import { RemoteBrowser } from './browser'
import { ILogEntry } from '@/core/log'
import { createReporter } from './reporter-factory'
import EventEmitter from 'events'
import { RunnerEvents } from '@/spec/event'
import { IRunnerEnvironment } from '@/spec/runner-environment'
import { visit } from '@/spec/command/visit'
import { get } from '@/spec/command/get'
import { wait } from '@/spec/command/wait'

const globAsync = promisify(glob)

export class Runner extends EventEmitter implements IRunnerEnvironment {
  Commands = new CommandRegistry()
  _currentInvocation: SpecInvocation | undefined
  _specs: { [key: string]: ISpecFile } = {}
  _lastSpecFile: string | undefined
  _lastSpecGroup: string | undefined
  _browser: RemoteBrowser
  _reporter: Mocha.reporters.Base
  _stats: Mocha.Stats = {
    suites: 0,
    tests: 0,
    passes: 0,
    pending: 0,
    failures: 0,
  }
  _suite: Mocha.Suite = {
    pending: false,
    root: true,
    delayed: false,
    parent: undefined,
    title: '',
    fullTitle: () => '',
    suites: [],
  } as any

  constructor(browserType: BrowserType, private cwd: string, public config: IConfig) {
    super()
    this._browser = new RemoteBrowser(browserType)
    this._reporter = createReporter(this, config.reporter, config.reporterOptions ?? {})
  }

  log(params: ILogEntry) {
    this.emit(RunnerEvents.EVENT_TEST_EVENT, params)
  }

  async initializeGlobalRunnerEnvironment() {
    ;(global as any)[GLOBAL_MODULE_NAME] = this
    ;(global as any).describe = this._describe.bind(this)
    ;(global as any).context = this._describe.bind(this)
    ;(global as any).it = this._it.bind(this)
    ;(global as any).specify = this._it.bind(this)

    this.Commands.add('visit', visit)
    this.Commands.addFluent('get', get as any)
    this.Commands.add('wait', wait)

    optionalRequire(this.config.e2e.supportFile)

    // Load all the specs we can find
    const specs = flatten(await Promise.all(flatten([this.config.e2e.specPattern]).map((glob) => globAsync(glob))))
    specs.forEach((spec) => {
      const name = basename(spec)
      this._specs[name] = { name, groups: {} }
      this._lastSpecFile = name
      require(spec)
    })

    // Clean up our environment to prevent any... shenanigans... happening while running each spec
    ;(global as any).describe = undefined
    ;(global as any).context = undefined
    ;(global as any).it = undefined
    ;(global as any).specify = undefined

    this.injectMochaSuites()
  }

  async runSpecs(): Promise<boolean> {
    this._stats.start = new Date()
    try {
      await this._browser.launch()
    } catch (err) {
      console.error(err)
      this._stats.end = new Date()
      this._stats.duration = this._stats.end!.getTime() - this.stats.start!.getTime()
      this.emit(RunnerEvents.EVENT_RUN_BEGIN)
      this.emit(RunnerEvents.EVENT_RUN_END)
      return false
    }

    this.emit(RunnerEvents.EVENT_RUN_BEGIN)

    const fileTotal = Object.keys(this._specs).length
    let fileIndex = 0

    for await (let specFile of Object.keys(this._specs)) {
      const fileSuite = this._suite.suites[fileIndex]
      this.emit(RunnerEvents.EVENT_FILE_BEGIN, this._specs[specFile], fileIndex, fileTotal)

      let groupIndex = 0
      for await (let group of Object.keys(this._specs[specFile].groups)) {
        const suite = fileSuite.suites[groupIndex]

        this.emit(RunnerEvents.EVENT_SUITE_BEGIN, suite)

        const specs = this._specs[specFile].groups[group]

        for await (let spec of specs) {
          const invocation = new SpecInvocation(this.Commands, spec, this.config, this.log.bind(this), this._browser)
          this.emit(RunnerEvents.EVENT_TEST_BEGIN, invocation as any)

          // Bind this invocation to the global environment
          this._currentInvocation = invocation
          ;(global as any)[GLOBAL_MINI_MODULE_NAME] = invocation

          const specRun = await invocation.runInvocations()
          switch (specRun.result) {
            case SpecRunResult.Passed:
              this._stats.passes++
              this.emit(RunnerEvents.EVENT_TEST_PASS, invocation as any)
              break
            case SpecRunResult.Failed:
              this._stats.failures++
              this.emit(RunnerEvents.EVENT_TEST_FAIL, invocation as any, specRun.error)
              break
            case SpecRunResult.Pending:
              this._stats.pending++
              this.emit(RunnerEvents.EVENT_TEST_PENDING, invocation as any)
              break
          }

          this.emit(RunnerEvents.EVENT_TEST_END, invocation as any)

          // Clean up the global environment now that the spec has finished running
          ;(global as any)[GLOBAL_MINI_MODULE_NAME] = undefined
          this._currentInvocation = undefined
        }

        this.emit(RunnerEvents.EVENT_SUITE_END, suite)
        this.emit(RunnerEvents.EVENT_FILE_END, this._specs[specFile], fileIndex, fileTotal)

        groupIndex++
      }

      fileIndex++
    }

    await this._browser.close()
    this._stats.end = new Date()
    this._stats.duration = this._stats.end!.getTime() - this.stats.start!.getTime()
    this.emit(RunnerEvents.EVENT_RUN_END)

    return this._stats.failures === 0
  }

  _describe(specGroup: string, generateSpecs: () => void) {
    if (!this._lastSpecFile) {
      throw new Error('describe() called outside of a spec file')
    }

    // TODO: We need to be able to handle nested describe blocks, currently we only support top-level describes
    this._lastSpecGroup = specGroup
    this._specs[this._lastSpecFile].groups[specGroup] = []
    this._stats.suites++
    generateSpecs()
  }

  _it(spec: string, runSpec: () => void) {
    if (!this._lastSpecFile || !this._lastSpecGroup) {
      throw new Error(
        `Error: dangling 'it' or 'specify'. You must enclose an 'it' or 'specify' call within a 'describe' or 'context' block`
      )
    }

    this._specs[this._lastSpecFile].groups[this._lastSpecGroup].push({
      name: spec,
      group: this._lastSpecGroup,
      run: runSpec,
    })
    this._stats.tests++
  }

  get browser(): RemoteBrowser {
    return this._browser
  }

  // The following functions are used for compatibility with mocha reporters

  get stats(): Mocha.Stats {
    return this._stats
  }

  get suite(): Mocha.Suite | undefined {
    return this._suite
  }

  /**
   * For compatibility with mocha reporters, we fill out a bunch of mocha suite metadata here. These aren't full
   * Suite classes, but for the most part they have enough of the required metadata for reporters to be compatible.
   */
  injectMochaSuites() {
    Object.keys(this._specs).forEach((specFile) => {
      this._suite.suites.push({
        pending: false,
        file: specFile,
        root: true,
        delayed: false,
        parent: undefined,
        title: specFile,
        fullTitle: () => specFile,
        suites: Object.keys(this._specs[specFile].groups).map(
          (group) =>
            ({
              pending: false,
              file: specFile,
              root: true,
              delayed: false,
              parent: undefined,
              title: group,
              fullTitle: () => `${specFile} ${group}`,
              suites: [],
            } as any)
        ),
      } as any)
    })
  }
}
