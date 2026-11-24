import { EarningCardFields } from '$env/types/env.earning-cards';
import {
	HARVEST_AUTOPILOT_ASSET_ICONS,
	HARVEST_AUTOPILOT_NETWORK_ICONS
} from '$eth/constants/harvest-autopilots.constants';
import { erc4626Tokens } from '$eth/derived/erc4626.derived';
import { AppPath } from '$lib/constants/routes.constants';
import { harvestAutopilotEarningData } from '$lib/derived/harvest-autopilot-earning.derived';
import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
import { harvestVaultsStore } from '$lib/stores/harvest.store';
import { get } from 'svelte/store';

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => mockGoto(...args) }));

describe('harvestAutopilotEarningData', () => {
	// Base bAutopilot_USDC, one of the vaults the app ships with.
	const mockVaultAddress = '0x0d877dc7c8fa3ad980dfdb18b48ec9f8768359c4';

	const mockApy = 5.5;

	// The ERC-4626 stores are filtered by the user-enabled networks, so turning every autopilot
	// network off empties them — the state this card has to keep rendering through.
	const mockAutopilotNetworksDisabled = () => {
		vi.spyOn(erc4626Tokens, 'subscribe').mockImplementation((fn) => {
			fn([]);
			return () => {};
		});
	};

	const mockUsdBalance = (balance: number) => {
		vi.spyOn(enabledMainnetFungibleTokensUsdBalance, 'subscribe').mockImplementation((fn) => {
			fn(balance);
			return () => {};
		});
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		mockGoto.mockClear();
		harvestVaultsStore.reset();

		mockAutopilotNetworksDisabled();
	});

	it('should expose the network and asset icons when no autopilot network is enabled', () => {
		const data = get(harvestAutopilotEarningData);

		expect(HARVEST_AUTOPILOT_NETWORK_ICONS.length).toBeGreaterThan(0);
		expect(HARVEST_AUTOPILOT_ASSET_ICONS.length).toBeGreaterThan(0);

		expect(data[EarningCardFields.NETWORKS]).toEqual(HARVEST_AUTOPILOT_NETWORK_ICONS);
		expect(data[EarningCardFields.ASSETS]).toEqual(HARVEST_AUTOPILOT_ASSET_ICONS);
	});

	it('should expose the max APY when no autopilot network is enabled', () => {
		harvestVaultsStore.set([
			{ id: 'vault-1', vaultAddress: mockVaultAddress, estimatedApy: `${mockApy}` }
		]);

		expect(get(harvestAutopilotEarningData)[EarningCardFields.APY]).toBe(`${mockApy}`);
	});

	it('should derive the earning potential from the current balance when no autopilot network is enabled', () => {
		const balance = 1000;

		mockUsdBalance(balance);
		harvestVaultsStore.set([
			{ id: 'vault-1', vaultAddress: mockVaultAddress, estimatedApy: `${mockApy}` }
		]);

		expect(get(harvestAutopilotEarningData)[EarningCardFields.EARNING_POTENTIAL]).toBeCloseTo(
			(balance * mockApy) / 100
		);
	});

	it('should report no position when no autopilot network is enabled', () => {
		mockUsdBalance(1000);
		harvestVaultsStore.set([
			{ id: 'vault-1', vaultAddress: mockVaultAddress, estimatedApy: `${mockApy}` }
		]);

		const data = get(harvestAutopilotEarningData);

		expect(data[EarningCardFields.CURRENT_EARNING]).toBe(0);
		expect(data[EarningCardFields.CURRENT_STAKED]).toBe(0);
	});

	it('should navigate to the autopilot page on action', async () => {
		await get(harvestAutopilotEarningData).action();

		expect(mockGoto).toHaveBeenCalledWith(AppPath.EarnAutopilot);
	});
});
