import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import SwapModal from '$lib/components/swap/SwapModal.svelte';
import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import { TokenCategoryTagValue } from '$lib/enums/token-tag';
import {
	MODAL_NETWORKS_LIST_CONTEXT_KEY,
	initModalNetworksListContext
} from '$lib/stores/modal-networks-list.store';
import {
	MODAL_TOKENS_LIST_CONTEXT_KEY,
	initModalTokensListContext,
	type ModalTokensListContext
} from '$lib/stores/modal-tokens-list.store';
import { tokenCategoryFilterStore } from '$lib/stores/settings.store';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext, type SwapContext } from '$lib/stores/swap.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('SwapModal', () => {
	const renderModal = ({
		swapContext = initSwapContext(),
		tokensListContext = initModalTokensListContext({ tokens: [] })
	}: {
		swapContext?: SwapContext;
		tokensListContext?: ModalTokensListContext;
	} = {}) =>
		render(SwapModal, {
			context: new Map<unknown, unknown>([
				[SWAP_CONTEXT_KEY, swapContext],
				[SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() }],
				[MODAL_TOKENS_LIST_CONTEXT_KEY, tokensListContext],
				[MODAL_NETWORKS_LIST_CONTEXT_KEY, initModalNetworksListContext({ networks: [] })],
				[IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore }]
			])
		});

	// The swap context outlives the modal: a navigation closes the modal without its own `close`.
	it('should reset the swap context when destroyed without being closed', () => {
		const swapContext = initSwapContext();

		const { unmount } = renderModal({ swapContext });

		swapContext.amountSetToMax.set(true);
		swapContext.lifiMaxFee.set({ fee: 1n, destinationTokenId: ETHEREUM_TOKEN.id });
		swapContext.lifiCarriedFee.set({ key: 'inputs', gas: 1n, l1Fee: 1n });

		unmount();

		expect(get(swapContext.amountSetToMax)).toBeFalsy();
		expect(get(swapContext.lifiMaxFee)).toBeUndefined();
		expect(get(swapContext.lifiCarriedFee)).toBeUndefined();
	});

	describe('asset type filter', () => {
		beforeEach(() => {
			tokenCategoryFilterStore.set({
				key: 'token-category-filter',
				value: { value: TokenCategoryTagValue.STABLECOIN }
			});
		});

		afterEach(() => {
			tokenCategoryFilterStore.reset({ key: 'token-category-filter' });

			mockPage.reset();
		});

		// The tokens list context outlives the modal, so it may still hold the asset type of a
		// previous swap.
		const initTokensListContext = () =>
			initModalTokensListContext({ tokens: [], filterCategoryTag: TokenCategoryTagValue.CRYPTO });

		it('should open the token lists on the asset type selected on the assets page', () => {
			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Tokens}` });

			const tokensListContext = initTokensListContext();

			renderModal({ tokensListContext });

			expect(get(tokensListContext.filterCategoryTag)).toBe(TokenCategoryTagValue.STABLECOIN);
		});

		it('should open the token lists on all asset types outside the assets page', () => {
			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Activity}` });

			const tokensListContext = initTokensListContext();

			renderModal({ tokensListContext });

			expect(get(tokensListContext.filterCategoryTag)).toBeUndefined();
		});
	});
});
