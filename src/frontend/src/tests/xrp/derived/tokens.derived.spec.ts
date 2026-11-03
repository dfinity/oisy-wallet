import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { XRP_MAINNET_NETWORK_ID } from '$env/networks/networks.xrp.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import type { UserNetworks } from '$lib/types/user-networks';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
import { get } from 'svelte/store';

// `XRP_MAINNET_ENABLED` is false under TEST, so it is exposed as a mutable getter to keep
// both of its states reachable.
const mocks = vi.hoisted(() => ({
	xrpMainnetEnabled: true,
	userNetworks: {} as Record<symbol, { enabled: boolean; isTestnet: boolean }>
}));

vi.mock('$env/networks/networks.xrp.env', async () => {
	const actual = await vi.importActual<Record<string, unknown>>('$env/networks/networks.xrp.env');

	return {
		...actual,
		get XRP_MAINNET_ENABLED() {
			return mocks.xrpMainnetEnabled;
		},
		SUPPORTED_XRP_NETWORKS: [actual.XRP_MAINNET_NETWORK],
		SUPPORTED_XRP_NETWORK_IDS: [actual.XRP_MAINNET_NETWORK_ID]
	};
});

// `userNetworks` is stubbed rather than driven through `userProfileStore`: the profile
// round-trip maps network ids to backend settings keys, and XRP has no key mapping yet,
// so a saved XRP preference cannot be expressed there. Stubbing keeps this spec on
// `enabledXrpTokens`' own contract — the build flag and the user's network enablement.
// Minimal readable: each `get()` re-subscribes, so the current hoisted value is emitted.
vi.mock('$lib/derived/user-networks.derived', () => ({
	userNetworks: {
		subscribe: (run: (value: UserNetworks) => void) => {
			run(mocks.userNetworks as UserNetworks);

			return () => undefined;
		}
	}
}));

describe('tokens.derived', () => {
	describe('enabledXrpTokens', () => {
		beforeEach(() => {
			mocks.xrpMainnetEnabled = true;

			setupTestnetsStore('disabled');
			mocks.userNetworks = {
				[XRP_MAINNET_NETWORK_ID]: { enabled: true, isTestnet: false }
			};
		});

		it('should return the mainnet token when the network is enabled', () => {
			expect(get(enabledXrpTokens)).toEqual([XRP_TOKEN]);
		});

		it('should return no tokens when the mainnet build flag is off', () => {
			mocks.xrpMainnetEnabled = false;

			expect(get(enabledXrpTokens)).toEqual([]);
		});

		it('should return no tokens when the user disabled the network', () => {
			mocks.userNetworks = {
				[XRP_MAINNET_NETWORK_ID]: { enabled: false, isTestnet: false }
			};

			expect(get(enabledXrpTokens)).toEqual([]);
		});

		// Enabling an unrelated network must not pull XRP in.
		it('should return no tokens when the user enabled only another network', () => {
			mocks.userNetworks = { [ICP_NETWORK_ID]: { enabled: true, isTestnet: false } };

			expect(get(enabledXrpTokens)).toEqual([]);
		});

		// XRP is mainnet-only: there are no testnet or local tokens to unlock.
		it('should return only the mainnet token when testnets are enabled', () => {
			setupTestnetsStore('enabled');

			expect(get(enabledXrpTokens)).toEqual([XRP_TOKEN]);
		});
	});
});
