import {
	createSelectedNftHarness,
	createStepsHarness
} from '$tests/utils/steps-reactivity.test-utils.svelte';
import { flushSync } from 'svelte';

describe('SendModal', () => {
	describe('steps derivation reactivity (regression coverage)', () => {
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

	describe('selected NFT reactivity (regression coverage)', () => {
		it('writable derived overrides are reset when the page NFT becomes undefined', () => {
			const harness = createSelectedNftHarness();
			const selectedNft = { id: 'selected' };

			try {
				harness.selectWithDerived(selectedNft);

				expect(harness.readDerivedSelectedNft()).toBe(selectedNft);

				harness.setPageNft(undefined);
				flushSync();

				expect(harness.readDerivedSelectedNft()).toBeUndefined();
			} finally {
				harness.destroy();
			}
		});

		it('explicit state preserves manual list selections while the page NFT is undefined', () => {
			const harness = createSelectedNftHarness();
			const selectedNft = { id: 'selected' };

			try {
				harness.selectWithState(selectedNft);

				expect(harness.readStateSelectedNft()).toBe(selectedNft);

				harness.setPageNft(undefined);
				flushSync();

				expect(harness.readStateSelectedNft()).toBe(selectedNft);
			} finally {
				harness.destroy();
			}
		});

		it('explicit state syncs routed NFTs and reset clears the selection', () => {
			const harness = createSelectedNftHarness();
			const routedNft = { id: 'route-b' };

			try {
				harness.setPageNft(routedNft);
				flushSync();

				expect(harness.readStateSelectedNft()).toBe(routedNft);

				harness.resetStateSelection();

				expect(harness.readStateSelectedNft()).toBeUndefined();
			} finally {
				harness.destroy();
			}
		});
	});
});
