import { SUPPORTED_EVM_MAINNET_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
import SwapContexts from '$lib/components/swap/SwapContexts.svelte';
import {
	MODAL_NETWORKS_LIST_CONTEXT_KEY,
	type ModalNetworksListContext
} from '$lib/stores/modal-networks-list.store';
import { MODAL_TOKENS_LIST_CONTEXT_KEY } from '$lib/stores/modal-tokens-list.store';
import { SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import * as swapStoreModule from '$lib/stores/swap.store';
import { initSwapContext, SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render } from '@testing-library/svelte';
import * as sveltePackage from 'svelte';
import { setContext, tick } from 'svelte';
import { get } from 'svelte/store';

describe('SwapContexts', () => {
	let swapContext: SwapContext;

	beforeEach(() => {
		vi.restoreAllMocks();

		swapContext = initSwapContext();

		vi.spyOn(sveltePackage, 'setContext');
		vi.spyOn(swapStoreModule, 'initSwapContext').mockReturnValue(swapContext);

		setupUserNetworksStore('allEnabled');
	});

	it('should render children snippet', () => {
		const { getByTestId } = render(SwapContexts, {
			children: mockSnippet
		});

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
	});

	describe('context initialization', () => {
		it('should initialize swap amounts context', () => {
			render(SwapContexts, { children: mockSnippet });

			expect(setContext).toHaveBeenCalledWith(
				SWAP_AMOUNTS_CONTEXT_KEY,
				expect.objectContaining({
					store: expect.any(Object)
				})
			);
		});

		it('should initialize swap context', () => {
			render(SwapContexts, { children: mockSnippet });

			expect(setContext).toHaveBeenCalledWith(SWAP_CONTEXT_KEY, swapContext);
		});

		it('should initialize swap context with undefined tokens when swappableTokens is empty', () => {
			render(SwapContexts, { children: mockSnippet });

			expect(get(swapContext.sourceToken)).toBeUndefined();
			expect(get(swapContext.destinationToken)).toBeUndefined();
		});

		it('should initialize modal tokens list context', () => {
			render(SwapContexts, { children: mockSnippet });

			expect(setContext).toHaveBeenCalledWith(
				MODAL_TOKENS_LIST_CONTEXT_KEY,
				expect.objectContaining({
					filterQuery: expect.any(Object),
					filterNetwork: expect.any(Object),
					filteredTokens: expect.any(Object),
					setTokens: expect.any(Function),
					setFilterQuery: expect.any(Function),
					setFilterNetwork: expect.any(Function),
					setFilterNetworksIds: expect.any(Function),
					resetFilters: expect.any(Function)
				})
			);
		});

		it('should initialize modal networks list context', () => {
			render(SwapContexts, { children: mockSnippet });

			expect(setContext).toHaveBeenCalledWith(
				MODAL_NETWORKS_LIST_CONTEXT_KEY,
				expect.objectContaining({
					filteredNetworks: expect.any(Object),
					setNetworks: expect.any(Function),
					setAllowedNetworkIds: expect.any(Function),
					resetAllowedNetworkIds: expect.any(Function)
				})
			);
		});

		it('should initialize IC token fee context', () => {
			render(SwapContexts, { children: mockSnippet });

			expect(setContext).toHaveBeenCalledWith(
				IC_TOKEN_FEE_CONTEXT_KEY,
				expect.objectContaining({
					store: expect.any(Object)
				})
			);
		});

		it('should set all five contexts', () => {
			render(SwapContexts, { children: mockSnippet });

			expect(setContext).toHaveBeenCalledTimes(5);
		});
	});

	describe('reactive network sync', () => {
		const getNetworksListContext = (): ModalNetworksListContext => {
			const call = (setContext as ReturnType<typeof vi.fn>).mock.calls.find(
				([key]) => key === MODAL_NETWORKS_LIST_CONTEXT_KEY
			);
			return call?.[1] as ModalNetworksListContext;
		};

		it('should include all cross-chain swap mainnets when all networks are enabled', () => {
			render(SwapContexts, { children: mockSnippet });

			const networksListContext = getNetworksListContext();
			const networks = get(networksListContext.filteredNetworks);

			expect(networks).toEqual([ICP_NETWORK, ETHEREUM_NETWORK, ...SUPPORTED_EVM_MAINNET_NETWORKS]);
		});

		it('should only include ICP when all other networks are disabled before mount', () => {
			setupUserNetworksStore('allDisabled');

			render(SwapContexts, { children: mockSnippet });

			const networksListContext = getNetworksListContext();
			const networks = get(networksListContext.filteredNetworks);

			expect(networks).toEqual([ICP_NETWORK]);
		});

		it('should only include ICP and Ethereum when only Ethereum is enabled before mount', () => {
			setupUserNetworksStore([ETHEREUM_NETWORK.id]);

			render(SwapContexts, { children: mockSnippet });

			const networksListContext = getNetworksListContext();
			const networks = get(networksListContext.filteredNetworks);

			expect(networks).toEqual([ICP_NETWORK, ETHEREUM_NETWORK]);
		});

		it('should update networks list context when networks are disabled', async () => {
			render(SwapContexts, { children: mockSnippet });

			const networksListContext = getNetworksListContext();

			expect(get(networksListContext.filteredNetworks).length).toBeGreaterThan(1);

			setupUserNetworksStore('allDisabled');
			await tick();

			const updatedNetworks = get(networksListContext.filteredNetworks);

			expect(updatedNetworks).toEqual([ICP_NETWORK]);
		});
	});
});
