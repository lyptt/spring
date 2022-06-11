import { DEV_SHOW_BROWSER } from '@/core/config'
import { ILogEntry, LogLevel } from '@/core/log'
import { detectBrowserPath } from '@/util/detect-browser'
import puppeteer, { Browser, ElementHandle, HTTPRequest, HTTPResponse, JSHandle, Page } from 'puppeteer'
import { BrowserType } from './browser-type'

export interface INavigateOptions {
  method: string
  body?: string | null
  headers?: { [key: string]: any }
  failOnStatusCode?: boolean
  onBeforeLoad?: () => void
  onLoad?: () => void
  log?: boolean
  retryOnStatusCodeFailure?: boolean
  retryOnNetworkFailure?: boolean
  timeout?: number
  auth?: {
    username: string
    password: string
  }
  _remainingAttempts?: number
  _log?: (entry: ILogEntry) => void
  _logEvent?: string
}

export interface IBrowserStats {
  name: string
  version: string
  headless: boolean
}

declare const window: any

const interceptRequest =
  ({ method, headers, auth, onBeforeLoad, _log, _logEvent = '$navigate' }: INavigateOptions) =>
  (interceptedRequest: HTTPRequest): void => {
    _log?.({ level: LogLevel.Info, event: _logEvent, subject: interceptedRequest.url() })
    onBeforeLoad?.()
    let allHeaders: Record<string, string> = { ...(headers ?? {}) }

    if (auth) {
      allHeaders['Authorization'] = Buffer.from(`${auth.username}:${auth.password}`).toString('base64')
    }

    interceptedRequest.continue({ method, headers: allHeaders })
  }

const interceptResponse =
  (url: string, browser: RemoteBrowser, options: INavigateOptions) =>
  (interceptedResponse: HTTPResponse): void => {
    const {
      onLoad,
      failOnStatusCode,
      retryOnStatusCodeFailure,
      _remainingAttempts,
      _log,
      _logEvent = '$navigate',
    } = options

    if (!failOnStatusCode) {
      onLoad?.()
      return
    }

    if (interceptedResponse.status() >= 200 && interceptedResponse.status() <= 399) {
      onLoad?.()
      return
    }

    if (!retryOnStatusCodeFailure || (_remainingAttempts ?? 0) <= 0) {
      _log?.({
        level: LogLevel.Error,
        event: _logEvent,
        subject: url,
        status: interceptedResponse.status(),
      })
      throw new Error('Request failed')
    }

    // We defer the next navigation until after this handler has returned, to avoid any race conditions in puppeteer
    setTimeout(() => {
      browser.navigate(url, { ...options, _remainingAttempts: (_remainingAttempts ?? 0) - 1 })
    })
    return
  }

export class RemoteBrowser {
  private ctx?: Browser
  private page?: Page
  private interceptRequest?: (request: HTTPRequest) => void

  constructor(private type: BrowserType) {}

  stats: IBrowserStats = { name: 'Unknown', version: '0', headless: !DEV_SHOW_BROWSER }

  async launch() {
    const path = await detectBrowserPath(this.type)

    this.ctx = await puppeteer.launch({
      product: this.type,
      executablePath: path,
      headless: !DEV_SHOW_BROWSER,
    })

    const versionData = await this.ctx.version()
    const [name, version] = versionData.split('/')
    this.stats.name = name.replace('Headless', '')
    this.stats.version = version

    const pages = await this.ctx.pages()
    if (!pages.length) {
      this.page = await this.ctx.newPage()
    } else {
      this.page = pages[0]
    }

    this.page.setRequestInterception(true)
    this.page.on('request', (interceptedRequest) => {
      if (this.interceptRequest) {
        this.interceptRequest?.(interceptedRequest)
        this.interceptRequest = undefined
      } else {
        interceptedRequest.continue()
      }
    })
  }

  async navigate(to: string, options: INavigateOptions = { method: 'GET', timeout: 30000 }): Promise<void> {
    if (!this.page) {
      return
    }

    const { timeout, _remainingAttempts = 3, retryOnNetworkFailure, _log, _logEvent = '$navigate' } = options
    this.interceptRequest = interceptRequest(options)
    this.page.once('response', interceptResponse(to, this, options))

    try {
      await this.page.goto(to, { timeout })
    } catch (err) {
      if (typeof err === 'string') {
        _log?.({
          level: LogLevel.Error,
          event: _logEvent,
          subject: to,
          error: err,
        })
        throw err
      }

      if (retryOnNetworkFailure && (err as Error).message.startsWith('net::') && _remainingAttempts > 0) {
        _log?.({
          level: LogLevel.Error,
          event: _logEvent,
          subject: to,
          error: err as any,
        })
        return await this.navigate(to, { ...options, _remainingAttempts: _remainingAttempts - 1 })
      }

      throw err
    }
  }

  async querySelector<T>(selector: string): Promise<ElementHandle<T> | undefined | null> {
    return await this.page?.$(selector)
  }

  async execFor<T>(
    selector: string,
    pageFunction: (element: any, ...args: unknown[]) => ElementHandle<T> | undefined | null
  ): Promise<ElementHandle<T> | undefined | null> {
    return await this.page?.$eval(selector, pageFunction)
  }

  async exec<T>(code: string, pageFunction: string | Function): Promise<JSHandle<T> | undefined | null> {
    return await this.page?.waitForFunction(pageFunction)
  }

  async close() {
    await this.ctx?.close()
    this.page = undefined
    this.ctx = undefined
  }
}
