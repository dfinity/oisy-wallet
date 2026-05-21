import { createStepsHarness } from '$tests/utils/steps-reactivity.test-utils.svelte';
import { flushSync } from 'svelte';

describe('SendModal steps derivation reactivity (regression coverage)', () => {
	// Background:
	//   `LoaderNfts` re-emits a fresh `Nft` reference for the same logical NFT
	//   every 20s. Inside `SendModal.svelte`, the `steps` derivation used to
	//   read that reference directly via `nonNullish($pageNft)`, which made
	//   `steps` re-derive (returning a new array each tick). The fresh `steps`
	//   array then made `WizardModal` reconstruct `WizardStepsState`, whose
	//   constructor unconditionally resets `currentStep = steps[0]` — i.e.
	//   the open modal was silently bounced back to the first step (the
	//   destination form) every 20s.
	//
	//   The fix is to derive a primitive boolean `hasPageNft` first and
	//   consume *that* in `steps`. Svelte 5's `$derived` uses `safe_not_equal`
	//   on its output value as a propagation gate, so a boolean that stays
	//   `true` does NOT propagate to subscribers — even if the underlying
	//   `$pageNft` reference changed.
	//
	//   These tests pin that exact behavior so future refactors can't silently
	//   reintroduce the regression by inlining the nullish check.

	it('inline nonNullish(nft) re-derives steps when the nft reference changes (and produces a fresh array)', () => {
		const harness = createStepsHarness();

		const first = harness.readInlineSteps();
		const initialCount = harness.getInlineRecomputeCount();

		expect(initialCount).toBe(1);

		harness.setNft({ id: 'b' });
		flushSync();

		const second = harness.readInlineSteps();

		expect(harness.getInlineRecomputeCount()).toBe(2);

		expect(second).not.toBe(first);
	});

	it('extracted hasNft boolean does NOT re-derive steps when only the nft reference changes', () => {
		const harness = createStepsHarness();

		const first = harness.readExtractedSteps();
		const initialCount = harness.getExtractedRecomputeCount();

		expect(initialCount).toBe(1);

		harness.setNft({ id: 'b' });
		flushSync();

		const second = harness.readExtractedSteps();

		expect(harness.getExtractedRecomputeCount()).toBe(1);

		expect(second).toBe(first);
	});

	it('extracted hasNft boolean DOES re-derive steps when the nft becomes nullish (state actually changes)', () => {
		const harness = createStepsHarness();

		const first = harness.readExtractedSteps();

		expect(harness.getExtractedRecomputeCount()).toBe(1);

		harness.setNft(undefined);
		flushSync();

		const second = harness.readExtractedSteps();

		expect(harness.getExtractedRecomputeCount()).toBe(2);

		expect(second).not.toBe(first);
	});
});
