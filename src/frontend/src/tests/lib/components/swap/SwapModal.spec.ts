import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import SwapModal from '$lib/components/swap/SwapModal.svelte';
import {
	MODAL_NETWORKS_LIST_CONTEXT_KEY,
	initModalNetworksListContext
} from '$lib/stores/modal-networks-list.store';
import {
	MODAL_TOKENS_LIST_CONTEXT_KEY,
	initModalTokensListContext
} from '$lib/stores/modal-tokens-list.store';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('SwapModal', () => {
	// The swap context outlives the modal: a navigation closes the modal without its own `close`.
	it('should reset the swap context when destroyed without being closed', () => {
		const swapContext = initSwapContext();

		const { unmount } = render(SwapModal, {
			context: new Map<unknown, unknown>([
				[SWAP_CONTEXT_KEY, swapContext],
				[SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() }],
				[MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [] })],
				[MODAL_NETWORKS_LIST_CONTEXT_KEY, initModalNetworksListContext({ networks: [] })],
				[IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore }]
			])
		});

		swapContext.amountSetToMax.set(true);
		swapContext.lifiMaxFee.set({ fee: 1n, destinationTokenId: ETHEREUM_TOKEN.id });
		swapContext.lifiCarriedFee.set({ key: 'inputs', gas: 1n, l1Fee: 1n });

		unmount();

		expect(get(swapContext.amountSetToMax)).toBeFalsy();
		expect(get(swapContext.lifiMaxFee)).toBeUndefined();
		expect(get(swapContext.lifiCarriedFee)).toBeUndefined();
	});
});
