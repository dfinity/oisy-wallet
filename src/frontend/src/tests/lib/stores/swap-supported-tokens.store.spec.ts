import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
import { get } from 'svelte/store';

describe('swap-supported-tokens.store', () => {
	beforeEach(() => {
		swapSupportedTokensStore.reset();
	});

	it('should initialize as undefined', () => {
		expect(get(swapSupportedTokensStore)).toBeUndefined();
	});

	it('should set supported tokens state', () => {
		const state = {
			aggregated: {
				icp: { coverage: 'all' as const, supportedTokenIds: new Set(['canister-1', 'canister-2']) },
				evm: { coverage: 'some' as const, supportedTokenIds: new Set(['0xabc']) },
				sol: { coverage: 'none' as const, supportedTokenIds: new Set<string>() }
			},
			providers: []
		};

		swapSupportedTokensStore.set(state);

		const stored = get(swapSupportedTokensStore);

		expect(stored).toBeDefined();
		expect(stored?.aggregated.icp.coverage).toBe('all');
		expect(stored?.aggregated.icp.supportedTokenIds.has('canister-1')).toBeTruthy();
		expect(stored?.aggregated.icp.supportedTokenIds.has('canister-2')).toBeTruthy();
		expect(stored?.aggregated.evm.coverage).toBe('some');
		expect(stored?.aggregated.evm.supportedTokenIds.has('0xabc')).toBeTruthy();
		expect(stored?.aggregated.sol.coverage).toBe('none');
		expect(stored?.aggregated.sol.supportedTokenIds.size).toBe(0);
		expect(stored?.providers).toEqual([]);
	});

	it('should reset to undefined', () => {
		swapSupportedTokensStore.set({
			aggregated: {
				icp: { coverage: 'all', supportedTokenIds: new Set(['a']) },
				evm: { coverage: 'none', supportedTokenIds: new Set() },
				sol: { coverage: 'none', supportedTokenIds: new Set() }
			},
			providers: []
		});

		expect(get(swapSupportedTokensStore)).toBeDefined();

		swapSupportedTokensStore.reset();

		expect(get(swapSupportedTokensStore)).toBeUndefined();
	});
});
