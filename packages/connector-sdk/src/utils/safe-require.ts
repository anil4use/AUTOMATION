/**
 * Safely dynamic load Node.js modules or backend services at runtime
 * without causing Webpack static resolution errors during frontend builds.
 */
export function safeRequire(moduleName: string): any {
  if (typeof window !== 'undefined') {
    return null;
  }
  try {
    // eval('require') hides the require call from Webpack while retaining access to the CommonJS require function in Node.js
    const req = eval('require');
    return req(moduleName);
  } catch (err) {
    try {
      // Fallback for some environments
      const getReq = new Function('name', 'return require(name)');
      return getReq(moduleName);
    } catch {
      return null;
    }
  }
}
