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

vi.mock('$lib/providers/swap.providers', () => ({
	swapProviders: [
		{
			key: 'kongSwap',
			getQuote: vi.fn(),
			mapQuoteResult: vi.fn(),
			isEnabled: true,
			getSupportedTokens: mockKongSupportedTokens
		},
		{
			key: 'icpSwap',
			getQuote: vi.fn(),
			mapQuoteResult: vi.fn(),
			isEnabled: true,
			getSupportedTokens: mockIcpSwapSupportedTokens
		}
	]
}));

vi.mock('$lib/providers/icp-bridge-swap.providers', () => ({
	icpBridgeProviders: [
		{
			key: 'oneSec',
			getQuote: vi.fn(),
			isEnabled: true,
			getSupportedTokens: mockIcpBridgeSupportedTokens
		}
	]
}));

vi.mock('$lib/providers/evm-swap.providers', () => ({
	evmSwapProviders: [
		{
			key: 'velora',
			getQuote: mockEvmGetQuote,
			isEnabled: true
		},
		{
			key: 'nearIntents',
			getQuote: vi.fn(),
			isEnabled: true,
			getSupportedTokens: mockEvmGetSupportedTokens
		}
	]
}));

vi.mock('$lib/providers/sol-swap.providers', () => ({
	solSwapProviders: [
		{
			key: 'nearIntents',
			getQuote: mockSolGetQuote,
			isEnabled: true,
			getSupportedTokens: mockSolGetSupportedTokens
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

		const { loadSwapSupportedTokens } =
			await import('$lib/services/swap-supported-tokens.services');
		await loadSwapSupportedTokens({ identity: mockIdentity });

		const stored = get(swapSupportedTokensStore);

		expect(stored).toBeDefined();

		// ICP: Kong, ICP Swap and OneSec all have lists → 'all'
		expect(stored?.icp.coverage).toBe('all');
		expect(stored?.icp.supportedTokenIds).toEqual(
			new Set(['canister-a', 'canister-b', 'canister-c', 'canister-d'])
		);

		// EVM: Velora has no list, NEAR Intents does → 'some'
		expect(stored?.evm.coverage).toBe('some');
		expect(stored?.evm.supportedTokenIds).toEqual(new Set(['0xabc', '0xdef']));

		// SOL: NEAR Intents has list, only provider → 'all'
		expect(stored?.sol.coverage).toBe('all');
		expect(stored?.sol.supportedTokenIds).toEqual(new Set(['SplAddr1']));
	});

	it('should handle provider getSupportedTokens failures gracefully', async () => {
		mockKongSupportedTokens.mockResolvedValue(new Set(['canister-a']));
		mockIcpSwapSupportedTokens.mockRejectedValue(new Error('ICP Swap API error'));
		mockIcpBridgeSupportedTokens.mockRejectedValue(new Error('OneSec API error'));
		mockEvmGetSupportedTokens.mockRejectedValue(new Error('NEAR Intents API error'));
		mockSolGetSupportedTokens.mockResolvedValue(new Set(['SplAddr1']));

		const { loadSwapSupportedTokens } =
			await import('$lib/services/swap-supported-tokens.services');
		await loadSwapSupportedTokens({ identity: mockIdentity });

		const stored = get(swapSupportedTokensStore);

		expect(stored).toBeDefined();

		// ICP Swap failed: S only contains Kong's tokens, but coverage stays 'all'
		expect(stored?.icp.coverage).toBe('all');
		expect(stored?.icp.supportedTokenIds).toEqual(new Set(['canister-a']));

		// NEAR Intents failed: empty set, but coverage stays 'some'
		expect(stored?.evm.coverage).toBe('some');
		expect(stored?.evm.supportedTokenIds.size).toBe(0);

		// SOL: NEAR Intents succeeded
		expect(stored?.sol.coverage).toBe('all');
		expect(stored?.sol.supportedTokenIds).toEqual(new Set(['SplAddr1']));
	});

	it('should union token IDs across multiple providers in the same group', async () => {
		mockKongSupportedTokens.mockResolvedValue(new Set(['id-1', 'id-2', 'id-shared']));
		mockIcpSwapSupportedTokens.mockResolvedValue(new Set(['id-3', 'id-shared']));
		mockIcpBridgeSupportedTokens.mockResolvedValue(new Set(['id-4', 'id-shared']));
		mockEvmGetSupportedTokens.mockResolvedValue(new Set());
		mockSolGetSupportedTokens.mockResolvedValue(new Set());

		const { loadSwapSupportedTokens } =
			await import('$lib/services/swap-supported-tokens.services');
		await loadSwapSupportedTokens({ identity: mockIdentity });

		const stored = get(swapSupportedTokensStore);

		expect(stored?.icp.supportedTokenIds).toEqual(
			new Set(['id-1', 'id-2', 'id-3', 'id-4', 'id-shared'])
		);
	});
});
