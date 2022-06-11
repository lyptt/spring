import { BrowserType } from '@/spec/browser-type'

export function determineBrowserType(browser: any): BrowserType | undefined {
  if (typeof browser !== 'string') {
    return undefined
  }

  if (browser.toLowerCase() === 'chrome') {
    return BrowserType.Chrome
  } else if (browser.toLowerCase() === 'firefox') {
    return BrowserType.Firefox
  }

  return undefined
}
