export enum RunnerEvents {
  EVENT_HOOK_BEGIN = 'hook',
  EVENT_HOOK_END = 'hook end',
  EVENT_RUN_BEGIN = 'start',
  EVENT_RUN_END = 'end',
  EVENT_SUITE_BEGIN = 'suite',
  EVENT_SUITE_END = 'suite end',
  EVENT_TEST_BEGIN = 'test',
  EVENT_TEST_END = 'test end',
  EVENT_TEST_FAIL = 'fail',
  EVENT_TEST_PASS = 'pass',
  EVENT_TEST_PENDING = 'pending',
  EVENT_TEST_RETRY = 'retry',
  STATE_IDLE = 'idle',
  STATE_RUNNING = 'running',
  STATE_STOPPED = 'stopped',
  /**
   * Custom Mocha reporter event, indicates when we've started running the test suites in a specific file.
   */
  EVENT_FILE_BEGIN = 'file',
  /**
   * Custom Mocha reporter event, indicates when we've finished running the test suites in a specific file.
   */
  EVENT_FILE_END = 'file end',
  /**
   * Custom Mocha reporter event, logs a custom event (e.g. page navigation), the data will be an object conforming to
   * the ILogEntry interface.
   */
  EVENT_TEST_EVENT = 'test event',
}
