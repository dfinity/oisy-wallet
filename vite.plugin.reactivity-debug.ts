import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const SRC_FENCE = '/src/frontend/src/';
const SELF_MARKER = 'reactivity-debug';
const DEBUG_IMPORT_SOURCE = '$lib/utils/reactivity-debug.utils';
const DEBUG_HIT_FN = 'reactivityDebugHit';

const debugModulePath = resolve('src/frontend/src/lib/utils/reactivity-debug.utils.ts');

// Matches  $effect(() => {  |  $effect(async () => {  |  $derived.by(() => {
const EFFECT_PATTERN =
	/(\$(?:effect|derived\.by)\s*\(\s*(?:async\s+)?\(\s*\)\s*=>\s*\{)/g;

const extractFileLabel = (id: string): string => {
	const idx = id.indexOf(SRC_FENCE);
	if (idx !== -1) {
		return id.slice(idx + SRC_FENCE.length);
	}
	const parts = id.split('/');
	return parts.slice(-2).join('/');
};

/**
 * Vite plugin that transparently instruments reactive primitives so that
 * every recomputation is counted and exposed via `window.__oisyReactivityDebug`.
 *
 * Two mechanisms:
 * 1. `resolveId` — redirects `svelte/store` imports in user code to a wrapper
 *    that counts every store `derived` recomputation.
 * 2. `transform` — injects `reactivityDebugHit()` calls into every `$effect`
 *    and `$derived.by` callback in `.svelte` files.
 *
 * Automatically active in every environment except production (`DFX_NETWORK=ic`).
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions,func-style
export function reactivityDebugPlugin(): Plugin {
	let enabled = false;

	return {
		name: 'reactivity-debug',
		enforce: 'pre',

		configResolved: () => {
			const network = process.env.DFX_NETWORK ?? 'local';
			enabled = network !== 'ic';

			if (enabled) {
				// eslint-disable-next-line no-console
				console.log(
					'\x1b[35m[reactivity-debug]\x1b[0m plugin active — store derived + $effect/$derived.by recomputations will be counted'
				);
			}
		},

		// Redirect svelte/store → debug wrapper (auto-wraps every store `derived`)
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
		},

		// Inject reactivityDebugHit() into $effect / $derived.by callbacks
		// eslint-disable-next-line local-rules/prefer-object-params
		transform: (code, id) => {
			if (!enabled) {
				return;
			}
			if (!id.endsWith('.svelte') || !id.includes(SRC_FENCE) || id.includes('node_modules')) {
				return;
			}

			if (!EFFECT_PATTERN.test(code)) {
				return;
			}
			EFFECT_PATTERN.lastIndex = 0;

			const fileLabel = extractFileLabel(id);
			const alreadyImported = code.includes(DEBUG_HIT_FN);

			const result = code.replace(EFFECT_PATTERN, (match, _group: string, offset: number) => {
				const afterMatch = code.slice(offset + match.length);
				if (/^\s*\n\s*reactivityDebugHit/.test(afterMatch)) {
					return match;
				}

				const line = code.slice(0, offset).split('\n').length;
				const kind = match.includes('derived.by') ? '$derived.by' : '$effect';
				return `${match}\n\t\t${DEBUG_HIT_FN}('${fileLabel}:${line}:${kind}');`;
			});

			if (result === code) {
				return;
			}

			const withImport =
				alreadyImported
					? result
					: result.replace(
							/(<script\b[^>]*>)/i,
							`$1\n\timport { ${DEBUG_HIT_FN} } from '${DEBUG_IMPORT_SOURCE}';`
						);

			return { code: withImport, map: null };
		}
	};
}
