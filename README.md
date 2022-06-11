# What is this?

Spring is an alternative test runner for the [popular UI testing platform](https://tinyurl.com/cprssio).

_Note that there's no references at all to this testing platform by name, due to their very strict trademark rules.
If you're contributing, keep in mind that nothing in this repository should refer to the testing platform directly by
name._

We're not affiliated or endorsed in any way by them, please do not go to them for support or queries on this project.

**Why an alternative test runner?** Because not every corporate IT environment allows for users to download and execute
arbitrary executables on their computers.

The aim for Spring is to create a API-compatible test runner that can run the large majority of test suites that the
original can, with the ability to migrate with zero changes to the original testing platform when eventually approved
by your IT department.

Various issues have been raised on their Github to allow for binary-free execution of test suites, however the issues
are either closed, or remain open and ignored, hence the need for this project to exist.

Spring makes use of [puppeteer](https://github.com/puppeteer/puppeteer) for interacting with web browsers, running
them in headless mode, and supports all variations of Firefox and Google Chrome installed to their default locations
(varies depending on your host OS).

# Caveats

Spring doesn't support literally every feature available. Here's a few of the bigger things to keep in mind:

- Your config file must be an old-school .js file using `require()` for its import, the new template when using the test
  platform's app to set up your testing environment defaults to ES6 `import`s, so you'll need to change this if you're
  creating a brand new test suite.
- We rewire all imports and globals in your support/spec files to instead resolve the `spring` package. You don't need
  to do any work here. This keeps everything backwards compatible.
- Nothing is transpiled by babel at all, so all of your test code must target language features that your host NodeJS
  installation already supports, and packages will need to be resolvable from your project root or globally.
- `.mjs` files are not supported at all currently. They can be in the future. If this is important to you, feel free to
  raise a PR.
- Video capture is unsupported. Technically it's possible, but for now it's unimplemented.
- The original API is humungous. You'll likely find missing or incomplete functionality when using an existing test
  suite. The architecture of spring makes it easy to slot in new functionality, so feel free to raise a PR for anything
  extra that you need.

# Developing with Spring

Due to the fact that npm prohibits you from globally linking, a workaround has been put in place to allow you to debug Spring.

Define the environment variable `DEV_RESOLVE` with a path that points to the `src` folder of this repository,
then set the current working directory to a directory containing a project with a test suite you want to run. This will
allow you to run that test suite in the debugger of your choice.

The `DEV_SHOW_BROWSER` environment variable will display the launched browser instead of running it in headless.

You'll also need to define the following environment variables (they're baked into production builds). An example using
non-trademarked terms is shown, you'll need to use the original platform's name following the example's naming
convention:

```
MODULE_SEARCH_NAME: spring // used for require() rewiring
GLOBAL_MODULE_NAME: Spring // used within helper files e.g. [...].Commands.add()
GLOBAL_MINI_MODULE_NAME: sp // used within test suites e.g. [...].visit('http://localhost:3000')
```
