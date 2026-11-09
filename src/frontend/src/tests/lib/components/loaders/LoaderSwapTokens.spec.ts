import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import LoaderSwapTokens from '$lib/components/loaders/LoaderSwapTokens.svelte';
import * as swapSupportedTokensServices from '$lib/services/swap-supported-tokens.services';
import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

describe('LoaderSwapTokens', () => {
	const mockData = {
		aggregated: {
			icp: { coverage: 'all' as const, supportedTokenIds: new Set<string>() },
			evm: { coverage: 'all' as const, supportedTokenIds: new Set<string>() },
			sol: { coverage: 'all' as const, supportedTokenIds: new Set<string>() },
			btc: { coverage: 'all' as const, supportedTokenIds: new Set<string>() },
			xrp: { coverage: 'all' as const, supportedTokenIds: new Set<string>() }
		},
		providers: []
	};

	let reloadSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.resetAllMocks();

		swapSupportedTokensStore.reset();
		splDefaultTokensStore.reset();

		reloadSpy = vi
			.spyOn(swapSupportedTokensServices, 'reloadSolSwapSupportedTokens')
			.mockResolvedValue();
	});

	it('should load swap supported tokens when identity is available', async () => {
		mockAuthStore();

		const spy = vi
			.spyOn(swapSupportedTokensServices, 'loadSwapSupportedTokens')
			.mockResolvedValueOnce();

		render(LoaderSwapTokens);

		await waitFor(() => {
			expect(spy).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
		});
	});

	it('should not load when identity is null', () => {
		mockAuthStore(null);

		const spy = vi
			.spyOn(swapSupportedTokensServices, 'loadSwapSupportedTokens')
			.mockResolvedValueOnce();

		render(LoaderSwapTokens);

		expect(spy).not.toHaveBeenCalled();
	});

	it('should not reload when store is already populated', () => {
		mockAuthStore();

		swapSupportedTokensStore.set(mockData);

		const spy = vi
			.spyOn(swapSupportedTokensServices, 'loadSwapSupportedTokens')
			.mockResolvedValueOnce();

		render(LoaderSwapTokens);

		expect(spy).not.toHaveBeenCalled();
		expect(get(swapSupportedTokensStore)).toEqual(mockData);
	});

	// LI.FI's Solana source list is read off the SPL tokens, which load after the swap lists.
	describe('the Solana source lists', () => {
		beforeEach(() => {
			mockAuthStore();
		});

		it('should be read again once the swap lists have loaded', async () => {
			vi.spyOn(swapSupportedTokensServices, 'loadSwapSupportedTokens').mockImplementation(() => {
				swapSupportedTokensStore.set(mockData);

				return Promise.resolve();
			});

			render(LoaderSwapTokens);

			await waitFor(() => {
				expect(reloadSpy).toHaveBeenCalledOnce();
			});
		});

		it('should not be read before the swap lists have loaded', async () => {
			vi.spyOn(swapSupportedTokensServices, 'loadSwapSupportedTokens').mockResolvedValue();

			render(LoaderSwapTokens);

			splDefaultTokensStore.set([USDC_TOKEN]);
			await tick();

			expect(reloadSpy).not.toHaveBeenCalled();
		});

		it('should be read again when the Solana mainnet tokens change', async () => {
			swapSupportedTokensStore.set(mockData);

			render(LoaderSwapTokens);
			await tick();

			expect(reloadSpy).toHaveBeenCalledOnce();

			splDefaultTokensStore.set([USDC_TOKEN]);
			await tick();

			expect(reloadSpy).toHaveBeenCalledTimes(2);
		});

		it('should not be read again when the swap lists change but the tokens do not', async () => {
			swapSupportedTokensStore.set(mockData);

			render(LoaderSwapTokens);
			await tick();

			swapSupportedTokensStore.set({ ...mockData, providers: [] });
			await tick();

			expect(reloadSpy).toHaveBeenCalledOnce();
		});
	});
});
