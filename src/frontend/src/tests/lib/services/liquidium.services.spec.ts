import type { EthAddress } from '$eth/types/address';
import * as liquidiumApi from '$lib/api/liquidium.api';
import { getOrCreateLiquidiumProfile, loadLiquidium } from '$lib/services/liquidium.services';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumMarket, LiquidiumPortfolio } from '$lib/types/liquidium';
import * as liquidiumUtils from '$lib/utils/liquidium.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

vi.mock('$lib/api/liquidium.api', () => ({
	liquidiumClient: vi.fn()
}));

vi.mock('$lib/utils/liquidium.utils', () => ({
	mapLiquidiumMarket: vi.fn(),
	mapLiquidiumPortfolio: vi.fn()
}));

describe('liquidium.services', () => {
	const ethAddress = '0x1111111111111111111111111111111111111111' as EthAddress;
	const profileId = 'profile-principal-text';

	const getProfileId = vi.fn();
	const createProfile = vi.fn();
	const listPools = vi.fn();
	const getAssetPrices = vi.fn();
	const getUserReserves = vi.fn();
	const getUserPositionSummary = vi.fn();

	const market: LiquidiumMarket = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true
	};
	const portfolio = { netValueUsd: 60 } as LiquidiumPortfolio;

	beforeEach(() => {
		vi.clearAllMocks();
		liquidiumStore.reset();
		vi.mocked(liquidiumApi.liquidiumClient).mockReturnValue({
			accounts: { getProfileId, createProfile },
			market: { listPools, getAssetPrices },
			positions: { getUserReserves, getUserPositionSummary }
		} as unknown as ReturnType<typeof liquidiumApi.liquidiumClient>);
		vi.mocked(liquidiumUtils.mapLiquidiumMarket).mockReturnValue(market);
		vi.mocked(liquidiumUtils.mapLiquidiumPortfolio).mockReturnValue(portfolio);
		getAssetPrices.mockResolvedValue({});
	});

	describe('getOrCreateLiquidiumProfile', () => {
		it('returns the existing profile without creating one', async () => {
			getProfileId.mockResolvedValue(profileId);

			const result = await getOrCreateLiquidiumProfile({ identity: mockIdentity, ethAddress });

			expect(result).toBe(profileId);
			expect(getProfileId).toHaveBeenCalledExactlyOnceWith(ethAddress);
			expect(createProfile).not.toHaveBeenCalled();
		});

		it('creates an ETH-owned profile when none exists', async () => {
			getProfileId.mockResolvedValue(null);
			createProfile.mockResolvedValue(profileId);

			const result = await getOrCreateLiquidiumProfile({ identity: mockIdentity, ethAddress });

			expect(result).toBe(profileId);
			expect(createProfile).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ account: ethAddress, chain: 'ETH' })
			);
		});
	});

	describe('loadLiquidium', () => {
		it('resets the store and does not call the SDK when there is no identity', async () => {
			liquidiumStore.set({ markets: [market], portfolio, assetPrices: {} });

			await loadLiquidium({ identity: null, ethAddress });

			expect(get(liquidiumStore)).toEqual({
				markets: [],
				portfolio: null,
				assetPrices: {}
			});
			expect(liquidiumApi.liquidiumClient).not.toHaveBeenCalled();
		});

		it('loads markets only when the user has no profile', async () => {
			listPools.mockResolvedValue([{ id: 'pool-btc' }]);
			getProfileId.mockResolvedValue(null);

			await loadLiquidium({ identity: mockIdentity, ethAddress });

			expect(get(liquidiumStore)).toEqual({
				markets: [market],
				portfolio: null,
				assetPrices: {}
			});
			expect(getUserReserves).not.toHaveBeenCalled();
			expect(getUserPositionSummary).not.toHaveBeenCalled();
		});

		it('skips the profile lookup entirely when no ETH address is available', async () => {
			listPools.mockResolvedValue([{ id: 'pool-btc' }]);

			await loadLiquidium({ identity: mockIdentity, ethAddress: undefined });

			expect(get(liquidiumStore).portfolio).toBeNull();
			expect(getProfileId).not.toHaveBeenCalled();
		});

		it('loads markets and portfolio when a profile exists', async () => {
			listPools.mockResolvedValue([{ id: 'pool-btc' }]);
			getProfileId.mockResolvedValue(profileId);
			getUserReserves.mockResolvedValue([]);
			getUserPositionSummary.mockResolvedValue({});

			await loadLiquidium({ identity: mockIdentity, ethAddress });

			expect(getUserReserves).toHaveBeenCalledExactlyOnceWith(profileId);
			expect(getUserPositionSummary).toHaveBeenCalledExactlyOnceWith(profileId);
			expect(get(liquidiumStore)).toEqual({
				markets: [market],
				portfolio,
				assetPrices: {}
			});
		});

		it('swallows SDK errors and leaves the store unchanged', async () => {
			listPools.mockRejectedValue(new Error('rpc down'));

			await expect(loadLiquidium({ identity: mockIdentity, ethAddress })).resolves.toBeUndefined();

			expect(get(liquidiumStore)).toEqual({
				markets: [],
				portfolio: null,
				assetPrices: {}
			});
		});
	});
});
