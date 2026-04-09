import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
import { get } from 'svelte/store';

describe('swap-supported-tokens.store', () => {
	beforeEach(() => {
		swapSupportedTokensStore.reset();
	});

	it('should initialize as undefined', () => {
		expect(get(swapSupportedTokensStore)).toBeUndefined();
	});

	it('should set supported tokens data', () => {
		const data = {
			icp: { coverage: 'all' as const, supportedTokenIds: new Set(['canister-1', 'canister-2']) },
			evm: { coverage: 'some' as const, supportedTokenIds: new Set(['0xabc']) },
			sol: { coverage: 'none' as const, supportedTokenIds: new Set<string>() }
		};

		swapSupportedTokensStore.set(data);

		const stored = get(swapSupportedTokensStore);

		expect(stored).toBeDefined();
		expect(stored?.icp.coverage).toBe('all');
		expect(stored?.icp.supportedTokenIds.has('canister-1')).toBeTruthy();
		expect(stored?.icp.supportedTokenIds.has('canister-2')).toBeTruthy();
		expect(stored?.evm.coverage).toBe('some');
		expect(stored?.evm.supportedTokenIds.has('0xabc')).toBeTruthy();
		expect(stored?.sol.coverage).toBe('none');
		expect(stored?.sol.supportedTokenIds.size).toBe(0);
	});

	it('should reset to undefined', () => {
		swapSupportedTokensStore.set({
			icp: { coverage: 'all', supportedTokenIds: new Set(['a']) },
			evm: { coverage: 'none', supportedTokenIds: new Set() },
			sol: { coverage: 'none', supportedTokenIds: new Set() }
		});

		expect(get(swapSupportedTokensStore)).toBeDefined();

		swapSupportedTokensStore.reset();

		expect(get(swapSupportedTokensStore)).toBeUndefined();
	});
});
