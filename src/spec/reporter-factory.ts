import { MODULE_SEARCH_NAME } from '@/core/config'
import SpringReporter from '@/core/spring-reporter'
import { reporters } from 'mocha'

type ReporterConstructor = new (runner: Mocha.Runner, options: Mocha.MochaOptions) => Mocha.reporters.Base

const BUILT_IN_REPORTERS: { [key: string]: ReporterConstructor } = {
  doc: reporters.Doc,
  dot: reporters.Dot,
  html: reporters.HTML,
  'json-stream': reporters.JSONStream,
  json: reporters.JSON,
  landing: reporters.Landing,
  list: reporters.List,
  markdown: reporters.Markdown,
  min: reporters.Min,
  nyan: reporters.Nyan,
  progress: reporters.Progress,
  spec: reporters.Spec,
  tap: reporters.TAP,
  xunit: reporters.XUnit,
  spring: SpringReporter,
  [MODULE_SEARCH_NAME]: SpringReporter,
}

export function createReporter(runner: any, reporter: string, options: any): Mocha.reporters.Base {
  if (reporter.endsWith('.js')) {
    try {
      const CustomReporter: ReporterConstructor | null | undefined = require(reporter)
      if (CustomReporter) {
        return new CustomReporter(runner, options)
      }
    } catch (err) {
      console.warn('Failed to load reporter ' + reporter + '. Using default reporter.')
    }
  }

  const reporterName = reporter.toLowerCase()

  if (reporterName in BUILT_IN_REPORTERS) {
    const BuiltInReporter = BUILT_IN_REPORTERS[reporterName] as ReporterConstructor
    return new BuiltInReporter(runner, options)
  }

  const BuiltInReporter = BUILT_IN_REPORTERS['min'] as ReporterConstructor
  return new BuiltInReporter(runner, options)
}
