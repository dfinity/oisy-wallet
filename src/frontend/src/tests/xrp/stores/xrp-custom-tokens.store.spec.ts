import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { xrpCustomTokensStore } from '$xrp/stores/xrp-custom-tokens.store';
import { get } from 'svelte/store';

describe('xrp-custom-tokens.store', () => {
	beforeEach(() => {
		xrpCustomTokensStore.reset();
	});

	it('is not loaded initially', () => {
		expect(get(xrpCustomTokensStore)).toBeUndefined();
	});

	it('replaces the whole list on every set', () => {
		xrpCustomTokensStore.set({ tokens: [{ ...RLUSD_TOKEN, enabled: true }], certified: false });
		xrpCustomTokensStore.set({ tokens: [], certified: true });

		expect(get(xrpCustomTokensStore)).toEqual({ tokens: [], certified: true });
	});

	it('forgets the list on reset', () => {
		xrpCustomTokensStore.set({ tokens: [{ ...RLUSD_TOKEN, enabled: true }], certified: true });
		xrpCustomTokensStore.reset();

		expect(get(xrpCustomTokensStore)).toBeUndefined();
	});
});
