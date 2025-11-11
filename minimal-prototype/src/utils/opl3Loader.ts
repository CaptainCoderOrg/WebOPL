/**
 * Shared OPL3 library loader
 *
 * This utility provides a single, consistent way to load the OPL3 library
 * across the application. It uses script injection (not eval) for security.
 */

/**
 * Check if OPL3 library is already loaded
 */
export function isOPL3Loaded(): boolean {
  return (
    typeof (globalThis as any).OPL3 !== 'undefined' &&
    typeof (globalThis as any).OPL3.OPL3 !== 'undefined'
  );
}

/**
 * Get OPL3 constructor if already loaded
 * @throws Error if not loaded
 */
export function getOPL3(): any {
  if (!isOPL3Loaded()) {
    throw new Error('OPL3 library not loaded. Call loadOPL3Library() first.');
  }
  return (globalThis as any).OPL3.OPL3;
}

/**
 * Load OPL3 library dynamically
 *
 * If already loaded, returns immediately.
 * Otherwise, injects script tag and waits for load.
 *
 * @returns Promise that resolves to OPL3 constructor
 */
export async function loadOPL3Library(): Promise<any> {
  // Return immediately if already loaded
  if (isOPL3Loaded()) {
    return getOPL3();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/node_modules/opl3/dist/opl3.js';

    script.onload = () => {
      if (isOPL3Loaded()) {
        resolve(getOPL3());
      } else {
        reject(new Error('OPL3 library loaded but OPL3.OPL3 not found'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load OPL3 script from /node_modules/opl3/dist/opl3.js'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Type definition for OPL3 instance (based on observed API)
 */
export interface OPL3Instance {
  write(register: number, value: number): void;
  read(buffer: Int16Array): void;
  init(sampleRate: number): void;
}
