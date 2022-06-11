import { RemoteBrowser } from '@/spec/browser'
import { IConfig } from '@/spec/config'

export interface IRunnerEnvironment {
  get browser(): RemoteBrowser
  get config(): IConfig
}
