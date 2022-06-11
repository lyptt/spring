/**
 * Requires the specified module from its source code
 * @param src the source code to evaluate within a module context
 * @param filename the filename of the source file
 * @returns the resolved module, or throws an Error if the module failed to compile
 */
export function requireFromString(src: string, filename: string = 'unknown.js'): any {
  var m = new (module.constructor as any)()
  m.paths = module.paths
  m._compile(src, filename)
  return m.exports
}

/**
 * Attempts to require the specified script path. If the path fails to resolve, no error is thrown.
 * @param path the path to require
 * @returns the resolved module, or undefined if the module failed to resolve
 */
export function optionalRequire(path: string): any {
  try {
    return require(path)
  } catch (err) {
    return undefined
  }
}
