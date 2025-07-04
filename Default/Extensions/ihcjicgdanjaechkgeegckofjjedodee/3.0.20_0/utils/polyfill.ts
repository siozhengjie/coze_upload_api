// Define a unified type
type PolyBrowser = typeof chrome & typeof browser;

// Set the global context to the window object if it exists, otherwise use self
const GLOBAL_CONTEXT = typeof window !== 'undefined' ? window : self;

// Create a polyBrowser object
const polyBrowser: PolyBrowser = (GLOBAL_CONTEXT as any).chrome || GLOBAL_CONTEXT.browser || browser;

// debug what user agent is being used and what is the browser

let idb: IDBFactory;
try {
  idb = indexedDB || GLOBAL_CONTEXT.indexedDB;
} catch (error:any) {
  console.log(`Error initializing indexedDB: ${error.message}`);
}

const performancePoly = performance || GLOBAL_CONTEXT.performance;
const URLPoly = URL || GLOBAL_CONTEXT.URL;

export {
  polyBrowser as chrome,
  idb as indexedDB,
  performancePoly as performance,
  URLPoly as URL,
};
