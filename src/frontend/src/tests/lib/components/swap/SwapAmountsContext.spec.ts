import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
import type { IcToken } from '$icp/types/ic-token';
import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
import * as authStore from '$lib/derived/auth.derived';
import * as tokensStore from '$lib/derived/tokens.derived';
import * as authServices from '$lib/services/auth.services';
import * as swapService from '$lib/services/swap.services';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { OptionAmount } from '$lib/types/send';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { act, render } from '@testing-library/svelte';
import { tick, type Snippet } from 'svelte';
import { get, readable, writable } from 'svelte/store';

const fakeSnippet: Snippet = (() => {}) as Snippet;

interface SwapAmountsContextProps {
	amount: OptionAmount;
	sourceToken: IcToken | undefined;
	destinationToken: IcToken | undefined;
	slippageValue: OptionAmount;
}

describe('SwapAmountsContext.svelte', () => {
	const [sourceToken, destinationToken] = [mockValidIcToken, mockValidIcCkToken] as IcToken[];

	let context: Map<symbol, unknown>;
	let store: ReturnType<typeof initSwapAmountsStore>;

	const renderWithContext = async (componentProps: SwapAmountsContextProps) => {
		await act(() =>
			render(SwapAmountsContext, {
				props: {
					...componentProps,
					children: fakeSnippet,
					isSwapAmountsLoading: false,
					isSourceTokenIcrc2: true
				},
				context
			})
		);

		await tick();
		await new Promise((resolve) => setTimeout(resolve, 350));
	};

	beforeEach(() => {
		store = initSwapAmountsStore();

		context = new Map([
			[
				SWAP_CONTEXT_KEY,
				{
					sourceToken: readable(sourceToken),
					destinationToken: readable(destinationToken),
					isSourceTokenIcrc2: readable(true),
					failedSwapError: writable(undefined)
				}
			],
			[SWAP_AMOUNTS_CONTEXT_KEY, { store }],
			[
				IC_TOKEN_FEE_CONTEXT_KEY,
				{
					store: readable({
						[sourceToken.symbol]: 1000n
					})
				}
			]
		]);

		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(mockIdentity));
		vi.spyOn(tokensStore, 'tokens', 'get').mockImplementation(() =>
			readable([sourceToken, destinationToken])
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('calls nullishSignOut when authIdentity is null', async () => {
		const signOutSpy = vi.spyOn(authServices, 'nullishSignOut').mockResolvedValue();
		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(null));

		await renderWithContext({
			amount: '100',
			sourceToken,
			destinationToken,
			slippageValue: '0.5'
		});

		expect(signOutSpy).toHaveBeenCalled();
	});

	it('resets store when amount is undefined', async () => {
		await renderWithContext({
			amount: undefined,
			sourceToken,
			destinationToken,
			slippageValue: '0.3'
		});

		expect(get(store)).toBeNull();
	});

	it('resets store when fetchSwapAmounts returns empty', async () => {
		vi.spyOn(swapService, 'fetchSwapAmounts').mockResolvedValue([]);

		await renderWithContext({
			amount: '15',
			sourceToken,
			destinationToken,
			slippageValue: '0.1'
		});

		expect(get(store)).toEqual({
			amountForSwap: 15,
			selectedProvider: undefined,
			swaps: []
		});
	});

	it('sets swaps when fetchSwapAmounts succeeds', async () => {
		const fetchMock = vi
			.spyOn(swapService, 'fetchSwapAmounts')
			.mockResolvedValue(mockSwapProviders);

		await renderWithContext({
			amount: '10',
			sourceToken,
			destinationToken,
			slippageValue: '0.3'
		});

		expect(fetchMock).toHaveBeenCalled();

		const value = get(store);

		expect(value?.swaps).toEqual(mockSwapProviders);
		expect(value?.selectedProvider).toEqual(mockSwapProviders[0]);
		expect(value?.amountForSwap).toBe(10);
	});

	it('sets empty swaps if fetchSwapAmounts throws', async () => {
		vi.spyOn(swapService, 'fetchSwapAmounts').mockRejectedValue(new Error('fail'));

		await renderWithContext({
			amount: '20',
			sourceToken,
			destinationToken,
			slippageValue: '0.2'
		});

		const value = get(store);

		expect(value?.swaps).toEqual([]);
		expect(value?.selectedProvider).toBeUndefined();
		expect(value?.amountForSwap).toBe(20);
	});
});
