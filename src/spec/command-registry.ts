export interface ICommand {
  name: string
  handler: () => Promise<void> | void | undefined
}

export interface ICommandDelegate {
  enqueueCommand(command: ICommand): void
}

export class CommandRegistry {
  private _commands: { [key: string]: () => void } = {}
  private _delegate: ICommandDelegate | undefined

  add(command: string, handler: (...argv: any[]) => Promise<void> | void | undefined) {
    if (command === 'runInvocations') {
      // Please don't be mean to me
      return
    }

    if (command in this._commands) {
      return
    }

    this._commands[command] = (...argv: any[]) =>
      this.delegate()?.enqueueCommand({ name: command, handler: () => handler.apply(undefined, argv) })
  }

  addFluent(command: string, handler: (...argv: any[]) => (...args: any[]) => void | undefined) {
    if (command === 'runInvocations') {
      // Please don't be mean to me
      return
    }

    if (command in this._commands) {
      return
    }

    // This is all a little crazy, but the end result is a deferred fluent (e.g. a().b().c()) task that captures all of
    // its arguments
    const realHandler = (fluentHandler: () => void | undefined) => {
      this.delegate()?.enqueueCommand({ name: command, handler: fluentHandler })
    }

    this._commands[command] = (...args: any[]) => handler(realHandler).apply(undefined, args)
  }

  overwrite(command: string, handler: (...argv: any[]) => Promise<void> | void | undefined) {
    if (command === 'runInvocations') {
      // Please don't be mean to me
      return
    }

    this._commands[command] = (...argv: any[]) =>
      this.delegate()?.enqueueCommand({ name: command, handler: () => handler.apply(undefined, argv) })
  }

  injectAll<T extends ICommandDelegate>(target: T) {
    Object.keys(this._commands).forEach((command) => ((target as any)[command] = this._commands[command]))
    this._delegate = target
  }

  delegate(): ICommandDelegate | undefined {
    return this._delegate
  }
}
