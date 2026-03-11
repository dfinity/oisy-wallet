import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const SRC_FENCE = '/src/frontend/src/';
const SELF_MARKER = 'reactivity-debug';
const DEBUG_IMPORT_SOURCE = '$lib/utils/reactivity-debug.utils';
const DEBUG_HIT_FN = 'reactivityDebugHit';
const DEBUG_LABEL_FN = '_setNextDerivedLabel';

const debugModulePath = resolve('src/frontend/src/lib/utils/reactivity-debug.utils.ts');

// Matches  $effect(() => {  |  $effect(async () => {  |  $derived.by(() => {
const EFFECT_PATTERN = /(\$(?:effect|derived\.by)\s*\(\s*(?:async\s+)?\(\s*\)\s*=>\s*\{)/g;

// Matches  derived(  but NOT  $derived(  or  originalDerived(
const DERIVED_CALL_PATTERN = /(?<![.$\w])derived\s*\(/g;

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
 * Three mechanisms:
 * 1. `resolveId` — redirects `svelte/store` imports in user code to a wrapper
 *    that counts every store `derived` recomputation.
 * 2. `transform` on `.ts` files — injects `_setNextDerivedLabel()` before every
 *    `derived()` call so labels survive minification.
 * 3. `transform` on `.svelte` files — injects `reactivityDebugHit()` into every
 *    `$effect` and `$derived.by` callback, and also labels `derived()` calls.
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

		// eslint-disable-next-line local-rules/prefer-object-params
		transform: (code, id) => {
			if (!enabled) {
				return;
			}
			if (!id.includes(SRC_FENCE) || id.includes('node_modules') || id.includes(SELF_MARKER)) {
				return;
			}

			const isSvelte = id.endsWith('.svelte');
			const isTs = id.endsWith('.ts');

			if (!isSvelte && !isTs) {
				return;
			}

			const fileLabel = extractFileLabel(id);
			let result = code;
			let needsHitImport = false;
			let needsLabelImport = false;

			// --- $effect / $derived.by injection (svelte files only) ---
			if (isSvelte && EFFECT_PATTERN.test(code)) {
				EFFECT_PATTERN.lastIndex = 0;

				result = result.replace(
					EFFECT_PATTERN,
					(match, _group: string, offset: number) => {
						const afterMatch = code.slice(offset + match.length);
						if (/^\s*\n\s*reactivityDebugHit/.test(afterMatch)) {
							return match;
						}

						needsHitImport = true;
						const line = code.slice(0, offset).split('\n').length;
						const kind = match.includes('derived.by') ? '$derived.by' : '$effect';
						return `${match}\n\t\t${DEBUG_HIT_FN}('${fileLabel}:${line}:${kind}');`;
					}
				);
			}

			// --- derived() label injection (ts and svelte files) ---
			if (DERIVED_CALL_PATTERN.test(result)) {
				DERIVED_CALL_PATTERN.lastIndex = 0;

				result = result.replace(
					DERIVED_CALL_PATTERN,
					(match, offset: number) => {
						needsLabelImport = true;
						const line = result.slice(0, offset).split('\n').length;
						return `(${DEBUG_LABEL_FN}('${fileLabel}:${line}:derived'), derived)(`;
					}
				);
			}

			if (result === code) {
				return;
			}

			// --- Add imports ---
			const alreadyImported = code.includes(DEBUG_IMPORT_SOURCE);
			const fnsToImport = [
				...(needsHitImport ? [DEBUG_HIT_FN] : []),
				...(needsLabelImport ? [DEBUG_LABEL_FN] : [])
			].filter((fn) => !code.includes(fn));

			if (fnsToImport.length > 0 && !alreadyImported) {
				const importStatement = `import { ${fnsToImport.join(', ')} } from '${DEBUG_IMPORT_SOURCE}';`;

				if (isSvelte) {
					result = result.replace(
						/(<script\b[^>]*>)/i,
						`$1\n\t${importStatement}`
					);
				} else {
					result = `${importStatement}\n${result}`;
				}
			} else if (fnsToImport.length > 0 && alreadyImported) {
				// Add missing functions to existing import
				for (const fn of fnsToImport) {
					result = result.replace(
						new RegExp(`(import\\s*\\{[^}]*)(\\}\\s*from\\s*['"]${DEBUG_IMPORT_SOURCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"])`),
						`$1, ${fn} $2`
					);
				}
			}

			return { code: result, map: null };
		}
	};
}
