import LoaderSwapSupportedTokens from '$lib/components/loaders/LoaderSwapSupportedTokens.svelte';
import * as swapSupportedTokensServices from '$lib/services/swap-supported-tokens.services';
import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('LoaderSwapSupportedTokens', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		swapSupportedTokensStore.reset();
	});

	it('should load swap supported tokens when identity is available', async () => {
		mockAuthStore();

		const spy = vi
			.spyOn(swapSupportedTokensServices, 'loadSwapSupportedTokens')
			.mockResolvedValueOnce();

		render(LoaderSwapSupportedTokens);

		await waitFor(() => {
			expect(spy).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
		});
	});

	it('should not load when identity is null', () => {
		mockAuthStore(null);

		const spy = vi
			.spyOn(swapSupportedTokensServices, 'loadSwapSupportedTokens')
			.mockResolvedValueOnce();

		render(LoaderSwapSupportedTokens);

		expect(spy).not.toHaveBeenCalled();
	});

	it('should not reload when store is already populated', () => {
		mockAuthStore();

		const mockData = {
			icp: { coverage: 'all' as const, supportedTokenIds: new Set<string>() },
			evm: { coverage: 'all' as const, supportedTokenIds: new Set<string>() },
			sol: { coverage: 'all' as const, supportedTokenIds: new Set<string>() }
		};
		swapSupportedTokensStore.set(mockData);

		const spy = vi
			.spyOn(swapSupportedTokensServices, 'loadSwapSupportedTokens')
			.mockResolvedValueOnce();

		render(LoaderSwapSupportedTokens);

		expect(spy).not.toHaveBeenCalled();
		expect(get(swapSupportedTokensStore)).toEqual(mockData);
	});
});
