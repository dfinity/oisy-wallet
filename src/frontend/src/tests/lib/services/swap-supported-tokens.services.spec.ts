import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

const mockKongSupportedTokens = vi.fn();
const mockIcpSwapSupportedTokens = vi.fn();
const mockIcpBridgeSupportedTokens = vi.fn();
const mockEvmGetQuote = vi.fn();
const mockEvmGetSupportedTokens = vi.fn();
const mockSolGetQuote = vi.fn();
const mockSolGetSupportedTokens = vi.fn();
const mockBtcGetQuote = vi.fn();
const mockBtcGetSupportedTokens = vi.fn();

const kongDestinations = vi.fn(() => ({}));
const icpSwapDestinations = vi.fn(() => ({}));
const icpBridgeDestinations = vi.fn(() => ({}));
const veloraDestinations = vi.fn(() => ({}));
const nearEvmDestinations = vi.fn(() => ({}));
const nearSolDestinations = vi.fn(() => ({}));
const chainFusionBtcDestinations = vi.fn(() => ({}));

vi.mock('$lib/providers/swap.providers', () => ({
	swapProviders: [
		{
			key: 'kongSwap',
			getQuote: vi.fn(),
			mapQuoteResult: vi.fn(),
			isEnabled: true,
			getSupportedTokens: mockKongSupportedTokens,
			getSupportedDestinations: kongDestinations
		},
		{
			key: 'icpSwap',
			getQuote: vi.fn(),
			mapQuoteResult: vi.fn(),
			isEnabled: true,
			getSupportedTokens: mockIcpSwapSupportedTokens,
			getSupportedDestinations: icpSwapDestinations
		}
	]
}));

vi.mock('$lib/providers/icp-bridge-swap.providers', () => ({
	icpBridgeProviders: [
		{
			key: 'oneSec',
			getQuote: vi.fn(),
			isEnabled: true,
			getSupportedTokens: mockIcpBridgeSupportedTokens,
			getSupportedDestinations: icpBridgeDestinations
		}
	]
}));

vi.mock('$lib/providers/evm-swap.providers', () => ({
	evmSwapProviders: [
		{
			key: 'velora',
			getQuote: mockEvmGetQuote,
			isEnabled: true,
			getSupportedDestinations: veloraDestinations
		},
		{
			key: 'nearIntents',
			getQuote: vi.fn(),
			isEnabled: true,
			getSupportedTokens: mockEvmGetSupportedTokens,
			getSupportedDestinations: nearEvmDestinations
		}
	]
}));

vi.mock('$lib/providers/sol-swap.providers', () => ({
	solSwapProviders: [
		{
			key: 'nearIntents',
			getQuote: mockSolGetQuote,
			isEnabled: true,
			getSupportedTokens: mockSolGetSupportedTokens,
			getSupportedDestinations: nearSolDestinations
		}
	]
}));

vi.mock('$lib/providers/btc-swap.providers', () => ({
	btcSwapProviders: [
		{
			key: 'chainFusion',
			getQuote: mockBtcGetQuote,
			isEnabled: true,
			getSupportedTokens: mockBtcGetSupportedTokens,
			getSupportedDestinations: chainFusionBtcDestinations
		}
	]
}));

describe('swap-supported-tokens.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		swapSupportedTokensStore.reset();
	});

	it('should load and store supported tokens from all provider groups', async () => {
		mockKongSupportedTokens.mockResolvedValue(new Set(['canister-a', 'canister-b']));
		mockIcpSwapSupportedTokens.mockResolvedValue(new Set(['canister-b', 'canister-c']));
		mockIcpBridgeSupportedTokens.mockResolvedValue(new Set(['canister-c', 'canister-d']));
		mockEvmGetSupportedTokens.mockResolvedValue(new Set(['0xabc', '0xdef']));
		mockSolGetSupportedTokens.mockResolvedValue(new Set(['SplAddr1']));
		mockBtcGetSupportedTokens.mockResolvedValue(new Set(['btc']));

		const { loadSwapSupportedTokens } =
			await import('$lib/services/swap-supported-tokens.services');
		await loadSwapSupportedTokens({ identity: mockIdentity });

		const stored = get(swapSupportedTokensStore);

		expect(stored).toBeDefined();

		// ICP: Kong, ICP Swap and OneSec all have lists → 'all'
		expect(stored?.aggregated.icp.coverage).toBe('all');
		expect(stored?.aggregated.icp.supportedTokenIds).toEqual(
			new Set(['canister-a', 'canister-b', 'canister-c', 'canister-d'])
		);

		// EVM: Velora has no list, NEAR Intents does → 'some'
		expect(stored?.aggregated.evm.coverage).toBe('some');
		expect(stored?.aggregated.evm.supportedTokenIds).toEqual(new Set(['0xabc', '0xdef']));

		// SOL: NEAR Intents has list, only provider → 'all'
		expect(stored?.aggregated.sol.coverage).toBe('all');
		expect(stored?.aggregated.sol.supportedTokenIds).toEqual(new Set(['SplAddr1']));

		// BTC: Chain Fusion has a list, only provider → 'all'
		expect(stored?.aggregated.btc.coverage).toBe('all');
		expect(stored?.aggregated.btc.supportedTokenIds).toEqual(new Set(['btc']));
	});

	it('should record per-provider source sets and destination resolvers', async () => {
		mockKongSupportedTokens.mockResolvedValue(new Set(['canister-a']));
		mockIcpSwapSupportedTokens.mockResolvedValue(new Set(['canister-b']));
		mockIcpBridgeSupportedTokens.mockResolvedValue(new Set(['canister-c']));
		mockEvmGetSupportedTokens.mockResolvedValue(new Set(['0xabc']));
		mockSolGetSupportedTokens.mockResolvedValue(new Set(['SplAddr1']));
		mockBtcGetSupportedTokens.mockResolvedValue(new Set(['btc']));

		const { loadSwapSupportedTokens } =
			await import('$lib/services/swap-supported-tokens.services');
		await loadSwapSupportedTokens({ identity: mockIdentity });

		const stored = get(swapSupportedTokensStore);

		expect(stored?.providers).toHaveLength(7);

		const veloraEntry = stored?.providers.find(
			(p) => p.key === 'velora' && p.sourceCategory === 'evm'
		);

		expect(veloraEntry).toBeDefined();
		expect(veloraEntry?.supportedSourceTokens).toBeUndefined();
		expect(veloraEntry?.getSupportedDestinations).toBe(veloraDestinations);

		const kongEntry = stored?.providers.find(
			(p) => p.key === 'kongSwap' && p.sourceCategory === 'icp'
		);

		expect(kongEntry?.supportedSourceTokens).toEqual(new Set(['canister-a']));
		expect(kongEntry?.getSupportedDestinations).toBe(kongDestinations);

		const chainFusionBtcEntry = stored?.providers.find(
			(p) => p.key === 'chainFusion' && p.sourceCategory === 'btc'
		);

		expect(chainFusionBtcEntry?.supportedSourceTokens).toEqual(new Set(['btc']));
		expect(chainFusionBtcEntry?.getSupportedDestinations).toBe(chainFusionBtcDestinations);
	});

	it('should handle provider getSupportedTokens failures gracefully', async () => {
		mockKongSupportedTokens.mockResolvedValue(new Set(['canister-a']));
		mockIcpSwapSupportedTokens.mockRejectedValue(new Error('ICP Swap API error'));
		mockIcpBridgeSupportedTokens.mockRejectedValue(new Error('OneSec API error'));
		mockEvmGetSupportedTokens.mockRejectedValue(new Error('NEAR Intents API error'));
		mockSolGetSupportedTokens.mockResolvedValue(new Set(['SplAddr1']));
		mockBtcGetSupportedTokens.mockRejectedValue(new Error('ckBTC minter unavailable'));

		const { loadSwapSupportedTokens } =
			await import('$lib/services/swap-supported-tokens.services');
		await loadSwapSupportedTokens({ identity: mockIdentity });

		const stored = get(swapSupportedTokensStore);

		expect(stored).toBeDefined();

		// ICP Swap failed: S only contains Kong's tokens, but coverage stays 'all'
		expect(stored?.aggregated.icp.coverage).toBe('all');
		expect(stored?.aggregated.icp.supportedTokenIds).toEqual(new Set(['canister-a']));

		// NEAR Intents failed: empty set, but coverage stays 'some'
		expect(stored?.aggregated.evm.coverage).toBe('some');
		expect(stored?.aggregated.evm.supportedTokenIds.size).toBe(0);

		// SOL: NEAR Intents succeeded
		expect(stored?.aggregated.sol.coverage).toBe('all');
		expect(stored?.aggregated.sol.supportedTokenIds).toEqual(new Set(['SplAddr1']));

		// BTC: Chain Fusion failed → empty set, coverage stays 'all' as its only provider
		expect(stored?.aggregated.btc.coverage).toBe('all');
		expect(stored?.aggregated.btc.supportedTokenIds.size).toBe(0);
	});

	it('should union token IDs across multiple providers in the same group', async () => {
		mockKongSupportedTokens.mockResolvedValue(new Set(['id-1', 'id-2', 'id-shared']));
		mockIcpSwapSupportedTokens.mockResolvedValue(new Set(['id-3', 'id-shared']));
		mockIcpBridgeSupportedTokens.mockResolvedValue(new Set(['id-4', 'id-shared']));
		mockEvmGetSupportedTokens.mockResolvedValue(new Set());
		mockSolGetSupportedTokens.mockResolvedValue(new Set());
		mockBtcGetSupportedTokens.mockResolvedValue(new Set());

		const { loadSwapSupportedTokens } =
			await import('$lib/services/swap-supported-tokens.services');
		await loadSwapSupportedTokens({ identity: mockIdentity });

		const stored = get(swapSupportedTokensStore);

		expect(stored?.aggregated.icp.supportedTokenIds).toEqual(
			new Set(['id-1', 'id-2', 'id-3', 'id-4', 'id-shared'])
		);
	});
});
