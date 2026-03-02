import type { SwappableTokens } from '$lib/derived/swap.derived';

const mockSwappableTokens = vi.hoisted(() => ({
	set: (_v: SwappableTokens) => {}
}));

vi.mock('$lib/derived/swap.derived', async () => {
	const { writable } = await import('svelte/store');
	const store = writable<SwappableTokens>({ sourceToken: undefined, destinationToken: undefined });
	mockSwappableTokens.set = (v) => store.set(v);
	return { swappableTokens: store };
});

import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
import SwapContexts from '$lib/components/swap/SwapContexts.svelte';
import { MODAL_NETWORKS_LIST_CONTEXT_KEY } from '$lib/stores/modal-networks-list.store';
import { MODAL_TOKENS_LIST_CONTEXT_KEY } from '$lib/stores/modal-tokens-list.store';
import { SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import {
	initSwapContext,
	SWAP_CONTEXT_KEY,
	type SwapContext
} from '$lib/stores/swap.store';
import * as swapStoreModule from '$lib/stores/swap.store';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';
import { setContext, tick } from 'svelte';
import * as sveltePackage from 'svelte';
import { get } from 'svelte/store';

describe('SwapContexts', () => {
	let swapContext: SwapContext;

	beforeEach(() => {
		vi.restoreAllMocks();

		swapContext = initSwapContext();

		vi.spyOn(sveltePackage, 'setContext');
		vi.spyOn(swapStoreModule, 'initSwapContext').mockReturnValue(swapContext);

		mockSwappableTokens.set({ sourceToken: undefined, destinationToken: undefined });
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

	describe('swappableTokens fallback', () => {
		it('should use swappableTokens source token as fallback when no explicit token is set', async () => {
			mockSwappableTokens.set({
				sourceToken: ICP_TOKEN,
				destinationToken: undefined
			});

			render(SwapContexts, { children: mockSnippet });

			await tick();

			expect(get(swapContext.sourceToken)).toEqual(ICP_TOKEN);
			expect(get(swapContext.destinationToken)).toBeUndefined();
		});

		it('should use swappableTokens destination token as fallback when no explicit token is set', async () => {
			mockSwappableTokens.set({
				sourceToken: undefined,
				destinationToken: ETHEREUM_TOKEN
			});

			render(SwapContexts, { children: mockSnippet });

			await tick();

			expect(get(swapContext.sourceToken)).toBeUndefined();
			expect(get(swapContext.destinationToken)).toEqual(ETHEREUM_TOKEN);
		});

		it('should prefer explicit token over swappableTokens fallback', async () => {
			mockSwappableTokens.set({
				sourceToken: ICP_TOKEN,
				destinationToken: undefined
			});

			render(SwapContexts, { children: mockSnippet });

			await tick();

			swapContext.setSourceToken(ETHEREUM_TOKEN);

			expect(get(swapContext.sourceToken)).toEqual(ETHEREUM_TOKEN);
		});

		it('should reactively update when swappableTokens changes and no explicit token is set', async () => {
			render(SwapContexts, { children: mockSnippet });

			expect(get(swapContext.sourceToken)).toBeUndefined();

			mockSwappableTokens.set({
				sourceToken: ICP_TOKEN,
				destinationToken: undefined
			});

			await tick();

			expect(get(swapContext.sourceToken)).toEqual(ICP_TOKEN);
		});

		it('should fall back to swappableTokens after reset', async () => {
			mockSwappableTokens.set({
				sourceToken: ICP_TOKEN,
				destinationToken: undefined
			});

			render(SwapContexts, { children: mockSnippet });

			await tick();

			swapContext.setSourceToken(ETHEREUM_TOKEN);

			expect(get(swapContext.sourceToken)).toEqual(ETHEREUM_TOKEN);

			swapContext.reset();

			expect(get(swapContext.sourceToken)).toEqual(ICP_TOKEN);
		});

		it('should reflect new swappableTokens after navigation and reset', async () => {
			mockSwappableTokens.set({
				sourceToken: ICP_TOKEN,
				destinationToken: undefined
			});

			render(SwapContexts, { children: mockSnippet });

			await tick();

			expect(get(swapContext.sourceToken)).toEqual(ICP_TOKEN);

			swapContext.reset();

			mockSwappableTokens.set({
				sourceToken: ETHEREUM_TOKEN,
				destinationToken: undefined
			});

			await tick();

			expect(get(swapContext.sourceToken)).toEqual(ETHEREUM_TOKEN);
		});
	});
});
