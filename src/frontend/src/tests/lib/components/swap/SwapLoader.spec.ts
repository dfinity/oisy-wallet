import { loadDisabledIcrcTokensExchanges } from '$icp/services/icrc.services';
import SwapLoader from '$lib/components/swap/SwapLoader.svelte';
import { allCrossChainSwapTokens } from '$lib/derived/all-tokens.derived';
import { loadDisabledErc20AndSplTokensExchanges } from '$lib/services/swap.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$icp/services/icrc.services', () => ({
	loadDisabledIcrcTokensBalances: vi.fn(),
	loadDisabledIcrcTokensExchanges: vi.fn()
}));

vi.mock('$lib/services/swap.services', () => ({
	loadDisabledErc20AndSplTokensExchanges: vi.fn(),
	loadKongSwapTokens: vi.fn()
}));

vi.mock('$lib/services/swap-supported-tokens.services', () => ({
	loadSwapSupportedTokens: vi.fn()
}));

describe('SwapLoader', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render button snippet', () => {
		const mockButton = vi.fn();
		render(SwapLoader, { button: mockButton });

		expect(mockButton).toHaveBeenCalled();
	});

	it('should price the disabled swap tokens when Swap opens', async () => {
		mockAuthStore();

		const mockButton = vi.fn();
		render(SwapLoader, { button: mockButton });

		const [[, getOnclick]] = mockButton.mock.calls;
		const onSwapReady = vi.fn();

		await getOnclick()(onSwapReady);

		expect(onSwapReady).toHaveBeenCalledOnce();
		expect(loadDisabledIcrcTokensExchanges).toHaveBeenCalledOnce();
		expect(loadDisabledErc20AndSplTokensExchanges).toHaveBeenCalledExactlyOnceWith({
			tokens: get(allCrossChainSwapTokens)
		});
	});
});
