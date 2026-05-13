export const prerender = true;
export const ssr = false;
export const trailingSlash = 'always';

// Polyfill Buffer for development purpose.
// For production build the polyfill is injected with Rollup (see vite.config.ai.ts).
import { Buffer } from 'buffer/';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.Buffer = Buffer;
