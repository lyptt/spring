import { SpecInvocation } from '@/spec/spec-invocation'
import { merge } from 'lodash'
import { INavigateOptions } from '../browser'

interface IVisitParams extends INavigateOptions {
  url?: string
  qs?: Record<string, string> | null
}

function buildUrl(address: string, qs: Record<string, string> | null | undefined): string {
  if (!qs) {
    return address
  }

  const params = new URLSearchParams(qs || {})
  return `${address}?${params}`
}

export async function visit(address: string | IVisitParams) {
  const defaultParams: INavigateOptions = {
    method: 'GET',
    body: null,
    headers: {},
    log: true,
    failOnStatusCode: true,
    retryOnStatusCodeFailure: false,
    retryOnNetworkFailure: true,
    timeout: SpecInvocation.current.config.pageLoadTimeout,
    _logEvent: 'visit',
    _log: SpecInvocation.current.log,
  }

  const params: IVisitParams =
    typeof address === 'string'
      ? {
          url: (SpecInvocation.current.config.e2e.baseUrl ?? '') + address || 'about:blank',
          method: 'GET',
        }
      : address

  const fullParams = merge(defaultParams, params)

  await SpecInvocation.current.browser.navigate(
    buildUrl(params.url ?? SpecInvocation.current.config.e2e.baseUrl ?? 'about:blank', fullParams.qs),
    fullParams
  )
}
