// Test-only helper that exercises the exact reactivity pattern used in
// `SendModal.svelte` for the `steps` derivation, with two variants:
//
// 1. Inline `nonNullish(nft)` directly in the `steps` derivation.
// 2. An intermediate boolean `$derived(nonNullish(nft))` whose value is then
//    consumed by `steps`.
//
// The helper exposes a small driver to flip the `nft` reference (keeping it
// non-null) and read back how many times each `steps` derivation re-ran and
// whether the produced step list reference is stable.
//
// This module exists to empirically demonstrate that Svelte 5's `$derived`
// uses `safe_not_equal` on its output value as a propagation gate: a
// primitive boolean intermediate that stays `true` does NOT propagate, even
// if the underlying object reference it was computed from changed.
//
// Lives in `tests/utils` (not next to the spec) because it mirrors the
// existing `*.test-utils` convention in this folder. The `.svelte.ts`
// extension is required because the harness uses runes (`$state`, `$derived`).

import { nonNullish } from '@dfinity/utils';

interface Nft {
	id: string;
}

interface StepsHarness {
	setNft: (nft: Nft | undefined) => void;
	readInlineSteps: () => readonly string[];
	readExtractedSteps: () => readonly string[];
	getInlineRecomputeCount: () => number;
	getExtractedRecomputeCount: () => number;
}

export const createStepsHarness = (): StepsHarness => {
	let nft = $state<Nft | undefined>({ id: 'a' });

	let inlineRecomputes = 0;
	let extractedRecomputes = 0;

	const inlineSteps = $derived.by(() => {
		inlineRecomputes += 1;
		return nonNullish(nft) ? (['DESTINATION', 'REVIEW', 'SENDING'] as const) : (['LIST'] as const);
	});

	const hasNft = $derived(nonNullish(nft));

	const extractedSteps = $derived.by(() => {
		extractedRecomputes += 1;
		return hasNft ? (['DESTINATION', 'REVIEW', 'SENDING'] as const) : (['LIST'] as const);
	});

	return {
		setNft: (next) => {
			nft = next;
		},
		readInlineSteps: () => inlineSteps,
		readExtractedSteps: () => extractedSteps,
		getInlineRecomputeCount: () => inlineRecomputes,
		getExtractedRecomputeCount: () => extractedRecomputes
	};
};
