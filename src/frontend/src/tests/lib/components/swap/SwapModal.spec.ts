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
import { saveSwapSlippage } from '$lib/utils/swap-slippage-storage.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('SwapModal', () => {
	const renderModal = () =>
		render(SwapModal, {
			context: new Map<unknown, unknown>([
				[SWAP_CONTEXT_KEY, initSwapContext()],
				[SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() }],
				[MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [] })],
				[MODAL_NETWORKS_LIST_CONTEXT_KEY, initModalNetworksListContext({ networks: [] })],
				[IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore }]
			])
		});

	describe('slippage', () => {
		beforeEach(() => {
			sessionStorage.clear();
		});

		it('should show the slippage in the header, right before the close button', () => {
			const { getByRole, getByTestId } = renderModal();

			const trigger = getByRole('button', { name: en.swap.text.max_slippage });

			expect(trigger.nextElementSibling).toBe(getByTestId('close-modal'));
			expect(within(trigger).getByText('1.5%')).toBeInTheDocument();
		});

		it('should open at the slippage saved earlier in the tab', () => {
			saveSwapSlippage('0.5');

			const { getByRole } = renderModal();

			const trigger = getByRole('button', { name: en.swap.text.max_slippage });

			expect(within(trigger).getByText('0.5%')).toBeInTheDocument();
		});

		it('should leave the slippage out of the form', () => {
			const { getByTestId, getAllByRole } = renderModal();

			expect(
				getAllByRole('button', { name: en.swap.text.max_slippage }).filter((button) =>
					button.closest('.content')
				)
			).toHaveLength(0);
			expect(getByTestId('modal-title')).toHaveTextContent(en.swap.text.swap);
		});

		it('should hide the slippage once the swap leaves its form step', async () => {
			const { getAllByText, queryByRole, getByTestId } = renderModal();

			await fireEvent.click(getAllByText(en.tokens.text.select_token)[0]);

			await waitFor(() =>
				expect(getByTestId('modal-title')).toHaveTextContent(en.swap.text.select_source_token)
			);

			expect(queryByRole('button', { name: en.swap.text.max_slippage })).not.toBeInTheDocument();
		});
	});

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
