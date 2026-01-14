import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import * as kongBackendApi from '$lib/api/kong_backend.api';
import GetTokenModal from '$lib/components/get-token/GetTokenModal.svelte';
import {
	GET_TOKEN_MODAL_OPEN_SWAP_BUTTON,
	SWAP_SWITCH_TOKENS_BUTTON
} from '$lib/constants/test-ids.constants';
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
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockKongBackendTokens } from '$tests/mocks/kong_backend.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$icp/api/icrc-ledger.api', () => ({
	icrc1SupportedStandards: () => Promise.resolve([])
}));

describe('GetTokenModal', () => {
	const mockContext = new Map();

	const mockSwapContext = () => {
		const mockToken = { ...mockValidIcToken, enabled: true };

		const originalContext = initSwapContext({
			sourceToken: mockToken,
			destinationToken: mockToken
		});

		const mockSwapContext = {
			...originalContext,
			sourceTokenExchangeRate: readable(10),
			destinationTokenExchangeRate: readable(2)
		};

		mockContext.set(SWAP_CONTEXT_KEY, mockSwapContext);
	};

	const setupSwapAmountsStore = () => {
		const swapAmountsStore = initSwapAmountsStore();
		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });
		return swapAmountsStore;
	};

	const setupModalTokensListContext = () => {
		mockContext.set(MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [] }));
	};

	const setupIcTokenFeeStore = () => {
		icTokenFeeStore.setIcTokenFee({
			tokenSymbol: mockValidIcToken.symbol,
			fee: 1000n
		});
		mockContext.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });
	};

	const setupModalNetworksListContext = () => {
		mockContext.set(
			MODAL_NETWORKS_LIST_CONTEXT_KEY,
			initModalNetworksListContext({ networks: [] })
		);
	};

	beforeEach(() => {
		mockSwapContext();
		setupSwapAmountsStore();
		setupIcTokenFeeStore();
		setupModalTokensListContext();
		setupModalNetworksListContext();
	});

	const renderGetTokenModal = () =>
		render(GetTokenModal, {
			props: {
				token: ICP_TOKEN,
				currentApy: 10
			},
			context: mockContext
		});

	it('should display GET_TOKEN step', () => {
		const { getAllByText } = renderGetTokenModal();

		expect(
			getAllByText(
				replacePlaceholders(en.stake.text.get_tokens, {
					$token_symbol: ICP_TOKEN.symbol
				})
			)[0]
		).toBeInTheDocument();
	});

	it('should display Swap wizard steps', async () => {
		const { getByTestId } = renderGetTokenModal();
		mockAuthStore();
		vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue(mockKongBackendTokens);

		await fireEvent.click(getByTestId(GET_TOKEN_MODAL_OPEN_SWAP_BUTTON));

		await waitFor(() => {
			expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeInTheDocument();
		});
	});
});
