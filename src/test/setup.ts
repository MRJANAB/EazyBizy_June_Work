import "@testing-library/jest-dom";

// jsdom's AbortSignal doesn't implement the `timeout` static (Node's does) —
// polyfill it so fetch(..., { signal: AbortSignal.timeout(ms) }) call sites
// (rulesApi.ts, useReportGenerator.ts) don't throw in tests.
if (typeof AbortSignal.timeout !== "function") {
  AbortSignal.timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
