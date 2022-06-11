import { GLOBAL_MINI_MODULE_NAME } from '@/core/config'
import { ILogEntry } from '@/core/log'
import { CommandRegistry, ICommand, ICommandDelegate } from '@/spec/command-registry'
import { ISpec } from '@/spec/model'
import { RemoteBrowser } from './browser'
import { IConfig } from './config'
import dayjs from 'dayjs'

export interface ISpecRun {
  result: SpecRunResult
  error?: Error
}

export enum SpecRunResult {
  Passed = 'pass',
  Failed = 'fail',
  Pending = 'pend',
}

export class SpecInvocation implements ICommandDelegate {
  private _commands: ICommand[] = []
  type = 'test'
  speed?: 'slow' | 'medium' | 'fast' | undefined
  err?: Error | undefined
  title: string
  group: string
  duration: number = 0

  constructor(
    registry: CommandRegistry,
    private spec: ISpec,
    public config: IConfig,
    public log: (params: ILogEntry) => void,
    public browser: RemoteBrowser
  ) {
    // Inject all of the test commands into this instance, ready to use as part of this spec invocation
    registry.injectAll(this)
    this.title = spec.name
    this.group = spec.group
  }

  static get current(): SpecInvocation {
    return (global as any)[GLOBAL_MINI_MODULE_NAME]
  }

  async runInvocations(): Promise<ISpecRun> {
    const start = new Date()

    this.spec.run()

    try {
      for await (let command of this._commands) {
        const task = command.handler()
        if (task instanceof Promise) {
          await task
        }
      }

      const end = new Date()
      this.duration = end.getTime() - start.getTime()

      return { result: SpecRunResult.Passed }
    } catch (err) {
      const end = new Date()
      this.duration = dayjs(end).diff(dayjs(start))

      return { result: SpecRunResult.Failed, error: typeof err === 'string' ? new Error(err) : (err as Error) }
    }
  }

  enqueueCommand(command: ICommand): void {
    this._commands.push(command)
  }

  // The following functions are used for compatibility with mocha reporters

  slow(): number {
    return this.config.e2e.slowTestThreshold
  }

  fullTitle(): string {
    return this.title
  }

  currentRetry(): number {
    return 0
  }

  // TODO: The built-in Markdown reporter uses this to log the test source code used to produce the test invocation.
  //       Currently this just returns a stub until it's actually implemented.
  get body(): string {
    return `function ${this.title}() {
      [native code]
  }`
  }

  get parent(): any {
    return {
      fullTitle: () => this.group,
    }
  }

  isPending(): boolean {
    return false
  }
}
