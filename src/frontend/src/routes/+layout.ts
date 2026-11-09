export const prerender = true;
export const ssr = false;
export const trailingSlash = 'always';

// ⚠️ For production build the polyfill needs to be injected with Rollup (see vite.config.ts) because the page might be loaded before the _layout.js which will contains this polyfill.
// The / in buffer/ is mandatory here.
// More workaround: https://github.com/vitejs/vite/discussions/2785
import { browser } from '$app/environment';
import { Buffer } from 'buffer/';
// Preserve Node's native Buffer while SvelteKit analyzes this module during builds.
if (browser) {
	Reflect.set(globalThis, 'Buffer', Buffer);
}
