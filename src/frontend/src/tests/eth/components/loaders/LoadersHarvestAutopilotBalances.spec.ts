import LoadersHarvestAutopilotBalances from '$eth/components/loaders/LoadersHarvestAutopilotBalances.svelte';
import { disabledHarvestAutopilotTokens } from '$eth/derived/harvest-autopilots.derived';
import { loadErc20Balances } from '$eth/services/eth-balance.services';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { syncBalancesFromCache } from '$lib/services/listener.services';
import { ethAddressStore } from '$lib/stores/address.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('$eth/services/eth-balance.services', () => ({
	loadErc20Balances: vi.fn()
}));

vi.mock('$lib/services/listener.services', () => ({
	syncBalancesFromCache: vi.fn()
}));

describe('LoadersHarvestAutopilotBalances', () => {
	const mockDisabledTokens: Erc4626CustomToken[] = [
		{
			...mockValidErc4626Token,
			enabled: false,
			version: 1n
		},
		{
			...mockValidErc4626Token,
			id: Symbol('Erc4626Token2') as unknown as typeof mockValidErc4626Token.id,
			address: '0xvaultAddress2',
			enabled: false,
			version: 1n
		}
	];

	beforeEach(() => {
		vi.clearAllMocks();

		vi.useFakeTimers();

		mockAuthStore();

		ethAddressStore.set({ data: mockEthAddress, certified: false });

		vi.spyOn(disabledHarvestAutopilotTokens, 'subscribe').mockImplementation((fn) => {
			fn(mockDisabledTokens);
			return () => {};
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should sync balances from the cache on mount', async () => {
		render(LoadersHarvestAutopilotBalances);

		await tick();

		expect(syncBalancesFromCache).toHaveBeenCalledTimes(mockDisabledTokens.length);

		mockDisabledTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(syncBalancesFromCache).toHaveBeenNthCalledWith(index + 1, {
				principal: mockIdentity.getPrincipal(),
				tokenId,
				networkId
			});
		});
	});

	it('should not sync balances from the cache on mount if not logged in', async () => {
		mockAuthStore(null);

		render(LoadersHarvestAutopilotBalances);

		await tick();

		expect(syncBalancesFromCache).not.toHaveBeenCalled();
	});

	it('should not throw if syncing balances from cache fails', async () => {
		vi.mocked(syncBalancesFromCache).mockRejectedValueOnce(new Error('Error syncing balances'));

		render(LoadersHarvestAutopilotBalances);

		await tick();

		expect(syncBalancesFromCache).toHaveBeenCalledTimes(mockDisabledTokens.length);
	});

	it('should call `loadErc20Balances` on mount', async () => {
		render(LoadersHarvestAutopilotBalances);

		await tick();

		expect(loadErc20Balances).toHaveBeenCalledOnce();
		expect(loadErc20Balances).toHaveBeenNthCalledWith(1, {
			address: mockEthAddress,
			tokens: mockDisabledTokens
		});
	});

	it('should not load balances if no address is set', async () => {
		ethAddressStore.reset();

		render(LoadersHarvestAutopilotBalances);

		await vi.advanceTimersByTimeAsync(1000);

		expect(loadErc20Balances).not.toHaveBeenCalled();
	});

	it('should re-trigger loading balances when address changes', async () => {
		vi.stubGlobal(
			'setInterval',
			vi.fn(() => 123456789)
		);

		render(LoadersHarvestAutopilotBalances);

		await tick();

		expect(loadErc20Balances).toHaveBeenCalledOnce();
		expect(loadErc20Balances).toHaveBeenNthCalledWith(1, {
			address: mockEthAddress,
			tokens: mockDisabledTokens
		});

		ethAddressStore.set({ data: mockEthAddress2, certified: false });

		await vi.advanceTimersByTimeAsync(1000);

		expect(loadErc20Balances).toHaveBeenCalledTimes(2);
		expect(loadErc20Balances).toHaveBeenNthCalledWith(2, {
			address: mockEthAddress2,
			tokens: mockDisabledTokens
		});

		vi.unstubAllGlobals();
	});

});