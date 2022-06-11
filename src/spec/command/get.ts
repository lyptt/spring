import { merge } from 'lodash'
import { SpecInvocation } from '../spec-invocation'
import chai, { expect, Assertion, util } from 'chai'
import injectAdditionalAssertions from '../assert'
import { LogLevel } from '@/core/log'

injectAdditionalAssertions(chai, Assertion, util)

interface IGetOptions {
  log?: boolean
  timeout?: number
  withinSubject?: string | null
  includeShadowDom?: boolean
}

class FluentGetSelector {
  private _assertion = ['be', 'truthy']
  private _log: boolean
  private _timeout: number
  private _totalTimeout: number
  private _withinSubject: string | undefined | null
  private _includeShadowDom: boolean

  constructor(
    private _result: (fluentHandler: () => void) => void,
    private _selector: string,
    { log, timeout }: IGetOptions
  ) {
    this._log = log || true
    this._timeout = timeout || 30000
    this._totalTimeout = timeout || 30000
    this._withinSubject = null
    this._includeShadowDom = true
  }

  should(assertion: string) {
    this._assertion = assertion.split('.')
    this._result(this.run.bind(this))
  }

  async _assertionPasses(): Promise<boolean> {
    // TODO: Contextualize selector search when nested in within() block
    const $el = await SpecInvocation.current.browser.querySelector<any>(this._selector)
    let chaiInstance = expect($el)

    try {
      for await (let assertion of this._assertion) {
        const step = (chaiInstance as any)[assertion]
        if (typeof step === 'function') {
          const result = step.call(chaiInstance)
          if (result instanceof Promise) {
            chaiInstance = await result
          } else {
            chaiInstance = result
          }
        } else {
          chaiInstance = step
        }
      }
    } catch (err) {
      if (this._log) {
        SpecInvocation.current.log({
          level: LogLevel.Error,
          event: 'get',
          subject: this._selector,
          detail: this._assertion.join('.'),
        })
      }
      return false
    }

    if (this._log) {
      SpecInvocation.current.log({
        level: LogLevel.Success,
        event: 'get',
        subject: this._selector,
        detail: this._assertion.join('.'),
      })
    }

    return true
  }

  async run(): Promise<void> {
    if (await this._assertionPasses()) {
      return
    }

    return new Promise((resolve, reject) => {
      // TODO: setInterval may take slightly longer each tick than what we specify, so we should have an end time we
      //       compare the current time to
      let remainingTime = this._timeout

      const tick = () => {
        this._assertionPasses().then((passes) => {
          if (passes) {
            return resolve()
          }

          remainingTime -= 1000
          if (remainingTime <= 0) {
            return reject(
              new Error(
                `AssertionError: Timed out retrying after ${this._totalTimeout}ms: expected '${
                  this._selector
                }' to match query '${this._assertion.join('.')}'`
              )
            )
          }

          setTimeout(tick, 1000)
        })
      }

      setTimeout(tick, 1000)
    })
  }
}

export const get =
  (result: (fluentHandler: () => void) => void) =>
  (selector: string, options?: IGetOptions): FluentGetSelector => {
    const defaultOptions: IGetOptions = {
      log: true,
      timeout: SpecInvocation.current.config.defaultCommandTimeout,
      withinSubject: null,
      includeShadowDom: SpecInvocation.current.config.includeShadowDom,
    }

    const fullOptions = merge(defaultOptions, options ?? {})

    return new FluentGetSelector(result, selector, fullOptions)
  }
