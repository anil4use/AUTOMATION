/**
 * Safely dynamic load Node.js modules or backend services at runtime
 * without causing Webpack static resolution errors during frontend builds.
 */
export function safeRequire(moduleName: string): any {
  if (typeof window !== 'undefined') {
    return null;
  }
  try {
    const getReq = new Function('name', 'return require(name)');
    return getReq(moduleName);
  } catch {
    return null;
  }
}
