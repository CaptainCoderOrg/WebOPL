/**
 * Polyfill for Node.js 'util' module
 *
 * The opl3 package uses util.inherits for class inheritance.
 * This polyfill provides the necessary functionality for browser environments.
 */

// Polyfill util.inherits
export const inherits = (ctor: any, superCtor: any) => {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

// Create the util module object
export const util = {
  inherits
};

// Set up global util for any code that needs it
(globalThis as any).util = util;

// Default export for ES modules
export default util;
