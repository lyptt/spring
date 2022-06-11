import os from 'os'
import fs from 'fs/promises'
import { BrowserType } from '@/spec/browser-type'

// HACK: We've cloned this type definition from NodeJS.Platform, which for some reason we can't import directly
type Platform =
  | 'aix'
  | 'android'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'cygwin'
  | 'netbsd'

type IExplicitBrowserMapping = {
  [key in Platform]: string[]
}

type IOptional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>

type IBrowserMapping = IOptional<IExplicitBrowserMapping, Platform>

const BROWSER_MAPPINGS: { [key in BrowserType]: IBrowserMapping } = {
  [BrowserType.Chrome]: {
    linux: ['google-chrome', 'google-chrome-stable', 'google-chrome-canary', 'chromium-browser', 'chromium'],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    win32: [
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env.ProgramW6432 + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env.ProgramFiles + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env['ProgramFiles(x86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome SxS\\Application\\chrome.exe',
      process.env.ProgramW6432 + '\\Google\\Chrome SxS\\Application\\chrome.exe',
      process.env.ProgramFiles + '\\Google\\Chrome SxS\\Application\\chrome.exe',
      process.env['ProgramFiles(x86)'] + '\\Google\\Chrome SxS\\Application\\chrome.exe',
      process.env['ProgramFiles(x86)'] + '\\Chromium\\Application\\chrome.exe',
    ],
  },
  [BrowserType.Firefox]: {
    linux: ['firefox'], // TODO: Determine Firefox Developer Edition Linux path
    darwin: [
      '/Applications/Firefox.app/Contents/MacOS/firefox-bin',
      '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox-bin',
    ],
    win32: [
      process.env.LOCALAPPDATA + '\\Mozilla Firefox\\firefox.exe',
      process.env.ProgramW6432 + '\\Mozilla Firefox\\firefox.exe',
      process.env.ProgramFiles + '\\Mozilla Firefox\\firefox.exe',
      process.env['ProgramFiles(x86)'] + '\\Mozilla Firefox\\firefox.exe',
      // TODO: Determine Firefox Developer Edition Win32 path
    ],
  },
}

export async function detectBrowserPath(type: BrowserType): Promise<string | undefined> {
  if (!(type in BROWSER_MAPPINGS)) {
    console.error(`Unsupported browser type '${type}'`)
    return
  }

  const platform = os.platform()
  const mappings = BROWSER_MAPPINGS[type]
  const platformMappings = mappings[platform]

  if (!platformMappings) {
    console.error(`Unsupported operating system '${platform}'`)
    return
  }

  for await (const path of platformMappings) {
    const stat = await fs.stat(path)
    if (stat.isFile()) {
      return path
    }
  }
}
