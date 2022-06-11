import { merge } from 'lodash'
import { SpecInvocation } from '@/spec/spec-invocation'

interface IWaitParams {
  log?: boolean
  timeout?: number
  requestTimeout?: number
  responseTimeout?: number
}

export function wait(timeout: number, params?: IWaitParams): Promise<void> {
  const defaultParams: IWaitParams = {
    log: true,
    timeout: SpecInvocation.current.config.requestTimeout || SpecInvocation.current.config.responseTimeout,
    requestTimeout: SpecInvocation.current.config.requestTimeout,
    responseTimeout: SpecInvocation.current.config.responseTimeout,
  }

  const fullParams = merge(defaultParams, params || {})

  return new Promise((resolve) => {
    setTimeout(resolve, timeout ?? defaultParams.timeout ?? 0)
  })
}
