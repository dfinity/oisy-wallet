import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const SRC_FENCE = '/src/frontend/src/';
const SELF_MARKER = 'reactivity-debug';

const debugModulePath = resolve('src/frontend/src/lib/utils/reactivity-debug.utils.ts');

/**
 * Vite plugin that transparently replaces `svelte/store` imports in user
 * source code with the debug wrapper that counts every `derived` recomputation.
 *
 * Activate by setting `VITE_REACTIVITY_DEBUG=true` in your `.env` file.
 * The plugin is a complete no-op when the flag is absent or false.
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions,func-style
export function reactivityDebugPlugin(): Plugin {
	let enabled = false;

	return {
		name: 'reactivity-debug',
		enforce: 'pre',

		configResolved: () => {
			enabled = process.env.VITE_REACTIVITY_DEBUG === 'true';

			if (enabled) {
				// eslint-disable-next-line no-console
				console.log(
					'\x1b[35m[reactivity-debug]\x1b[0m plugin active — every store `derived` recomputation will be counted'
				);
			}
		},

		// eslint-disable-next-line local-rules/prefer-object-params
		resolveId: (source, importer) => {
			if (!enabled || source !== 'svelte/store') {
				return;
			}

			if (
				!importer ||
				!importer.includes(SRC_FENCE) ||
				importer.includes('node_modules') ||
				importer.includes(SELF_MARKER)
			) {
				return;
			}

			return debugModulePath;
		}
	};
}
