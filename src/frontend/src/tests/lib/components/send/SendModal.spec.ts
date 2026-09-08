import SendModal from '$lib/components/send/SendModal.svelte';
import { token } from '$lib/stores/token.store';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import {
	createSelectedNftHarness,
	createStepsHarness
} from '$tests/utils/steps-reactivity.test-utils.svelte';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { flushSync } from 'svelte';

vi.mock(
	'$lib/components/send/SendTokensList.svelte',
	async () => await import('./SendModalTokensListStub.svelte')
);

vi.mock(
	'$lib/components/send/SendDestinationWizardStep.svelte',
	async () => await import('./SendModalDestinationStub.svelte')
);

vi.mock(
	'$lib/components/send/SendWizard.svelte',
	async () => await import('./SendModalWizardStub.svelte')
);

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

	describe('amount reset on token change', () => {
		// The amount lives above the wizard, so it survives step navigation. Carrying it over to a
		// newly selected token is at best confusing and, when the two tokens have different
		// decimals, produces an invalid amount and a failing gas fee estimation.

		type GetByTestId = (testId: string) => HTMLElement;

		const renderModal = async (): Promise<{ getByTestId: GetByTestId }> => {
			const result = render(SendModal, {
				props: { isTransactionsPage: false, isNftsPage: false }
			});

			await waitFor(() => expect(result.getByTestId('stub-select-token-a')).toBeInTheDocument());

			return result;
		};

		const selectToken = async ({
			getByTestId,
			testId
		}: {
			getByTestId: GetByTestId;
			testId: string;
		}) => {
			await fireEvent.click(getByTestId(testId));

			await waitFor(() => expect(getByTestId('stub-destination-next')).toBeInTheDocument());

			await fireEvent.click(getByTestId('stub-destination-next'));

			await waitFor(() => expect(getByTestId('stub-amount')).toBeInTheDocument());
		};

		const enterAmount = async ({ getByTestId }: { getByTestId: GetByTestId }) => {
			await fireEvent.click(getByTestId('stub-set-amount'));

			await waitFor(() => expect(getByTestId('stub-amount')).toHaveTextContent('5'));
		};

		const backToTokensList = async ({ getByTestId }: { getByTestId: GetByTestId }) => {
			await fireEvent.click(getByTestId('stub-to-tokens-list'));

			await waitFor(() => expect(getByTestId('stub-select-token-a')).toBeInTheDocument());
		};

		beforeEach(() => {
			token.reset();
		});

		it('clears the amount when another token is selected', async () => {
			const { getByTestId } = await renderModal();

			await selectToken({ getByTestId, testId: 'stub-select-token-a' });
			await enterAmount({ getByTestId });

			await backToTokensList({ getByTestId });
			await selectToken({ getByTestId, testId: 'stub-select-token-b' });

			expect(getByTestId('stub-amount').textContent).toBe('');
		});

		it('keeps the amount when only the destination changes', async () => {
			const { getByTestId } = await renderModal();

			await selectToken({ getByTestId, testId: 'stub-select-token-a' });
			await enterAmount({ getByTestId });

			await fireEvent.click(getByTestId('stub-send-back'));

			await waitFor(() =>
				expect(getByTestId('stub-destination-change-and-next')).toBeInTheDocument()
			);

			await fireEvent.click(getByTestId('stub-destination-change-and-next'));

			await waitFor(() => expect(getByTestId('stub-amount')).toBeInTheDocument());

			expect(getByTestId('stub-amount')).toHaveTextContent('5');
		});

		it('keeps the amount when the very same token is re-selected from the list', async () => {
			const { getByTestId } = await renderModal();

			await selectToken({ getByTestId, testId: 'stub-select-token-a' });
			await enterAmount({ getByTestId });

			await backToTokensList({ getByTestId });
			await selectToken({ getByTestId, testId: 'stub-select-token-a' });

			expect(getByTestId('stub-amount')).toHaveTextContent('5');
		});

		// The token stores reuse the `TokenId` they already hold for a given identifier, so a
		// reloaded token is a new object with the very same symbol - and must not count as a change.
		it('keeps the amount when the same token is re-selected as a reloaded object', async () => {
			const { getByTestId } = await renderModal();

			await selectToken({ getByTestId, testId: 'stub-select-token-a' });
			await enterAmount({ getByTestId });

			await backToTokensList({ getByTestId });
			await selectToken({ getByTestId, testId: 'stub-select-token-a-recreated' });

			expect(getByTestId('stub-amount')).toHaveTextContent('5');
		});

		// Two distinct assets can share a ticker, hence share a `TokenId` description, but never the
		// symbol itself.
		it('clears the amount when another token with the same symbol is selected', async () => {
			const { getByTestId } = await renderModal();

			await selectToken({ getByTestId, testId: 'stub-select-token-same-symbol-a' });
			await enterAmount({ getByTestId });

			await backToTokensList({ getByTestId });
			await selectToken({ getByTestId, testId: 'stub-select-token-same-symbol-b' });

			expect(getByTestId('stub-amount').textContent).toBe('');
		});

		it('keeps the amount when the token store re-emits the selected token as a fresh object', async () => {
			const { getByTestId } = await renderModal();

			await selectToken({ getByTestId, testId: 'stub-select-token-a' });
			await enterAmount({ getByTestId });

			const reloadedToken: Token = {
				...mockValidIcrcToken,
				id: parseTokenId(mockValidIcrcToken.symbol)
			};

			token.set(reloadedToken);

			await waitFor(() => expect(getByTestId('stub-amount')).toBeInTheDocument());

			expect(getByTestId('stub-amount')).toHaveTextContent('5');
		});
	});
});
