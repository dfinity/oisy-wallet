import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import * as appConstants from '$lib/constants/app.constants';
import { fungibleTokens, nativeTokens, tokens } from '$lib/derived/tokens.derived';
import type { UserNetworks } from '$lib/types/user-networks';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { get } from 'svelte/store';

// The XRP aggregation into `nativeTokens`/`tokens` lives in `tokens.derived.ts`, but
// `tokens.derived.spec.ts` cannot cover it: XRP is force-disabled under TEST, and enabling the
// XRP network catalog there makes `setupUserNetworksStore` hit `networkIdToKey`, which has no
// XRP case until the enable PR and warns to the console — which fails every test in the file.
// This spec therefore stubs `userNetworks` directly and asserts only the XRP contribution.
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
	describe('XRP aggregation', () => {
		beforeEach(async () => {
			vi.resetAllMocks();

			mocks.xrpMainnetEnabled = true;

			setupTestnetsStore('reset');

			vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => false);

			const { XRP_MAINNET_NETWORK_ID } = await import('$env/networks/networks.xrp.env');
			const { ICP_NETWORK_ID } = await import('$env/networks/networks.icp.env');
			const { SOLANA_MAINNET_NETWORK_ID } = await import('$env/networks/networks.sol.env');

			mocks.userNetworks = {
				[XRP_MAINNET_NETWORK_ID]: { enabled: true, isTestnet: false },
				[ICP_NETWORK_ID]: { enabled: true, isTestnet: false },
				[SOLANA_MAINNET_NETWORK_ID]: { enabled: true, isTestnet: false }
			};
		});

		it('should include the XRP token in nativeTokens', () => {
			expect(get(nativeTokens)).toContainEqual(XRP_TOKEN);
		});

		it('should include the XRP token in tokens', () => {
			expect(get(tokens)).toContainEqual(XRP_TOKEN);
		});

		// `fungibleTokens` builds on `nativeTokens`, so the XRP entry must reach it too.
		it('should include the XRP token in fungibleTokens', () => {
			expect(get(fungibleTokens)).toContainEqual(XRP_TOKEN);
		});

		it('should not include the XRP token when the mainnet build flag is off', () => {
			mocks.xrpMainnetEnabled = false;

			expect(get(nativeTokens)).not.toContainEqual(XRP_TOKEN);
			expect(get(tokens)).not.toContainEqual(XRP_TOKEN);
		});

		// Guards against the XRP spread being widened into something that drops the other chains.
		it('should keep the other native tokens alongside XRP', () => {
			const result = get(nativeTokens);

			expect(result).toContainEqual(ICP_TOKEN);
			expect(result).toContainEqual(SOLANA_TOKEN);
			expect(result).toContainEqual(XRP_TOKEN);
		});
	});
});
