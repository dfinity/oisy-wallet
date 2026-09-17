import { ARBITRUM_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK_SYMBOL } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { BTC_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import {
	ICP_NETWORK_SYMBOL,
	ICP_PSEUDO_TESTNET_NETWORK_SYMBOL
} from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks.sol.env';
import { enabledNetworksSymbols, networkXrpMainnetEnabled } from '$lib/derived/networks.derived';
import { get } from 'svelte/store';

// XRP is force-disabled under TEST, so its entry in the aggregation contributes nothing to the
// expectation below. The catalog is enabled here while the mainnet flag stays off by default, so
// the exact-list assertion is untouched and only the XRP block turns it on.
const mocks = vi.hoisted(() => ({ xrpMainnetEnabled: false }));

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

describe('networks.derived', () => {
	describe('enabledNetworksSymbols', () => {
		it('has correct data', () => {
			expect(get(enabledNetworksSymbols)).toEqual([
				BTC_MAINNET_NETWORK_SYMBOL,
				ETHEREUM_NETWORK_SYMBOL,
				ICP_NETWORK_SYMBOL,
				ICP_PSEUDO_TESTNET_NETWORK_SYMBOL,
				ARBITRUM_MAINNET_NETWORK_SYMBOL,
				BASE_NETWORK_SYMBOL,
				BSC_MAINNET_NETWORK_SYMBOL,
				POLYGON_MAINNET_NETWORK_SYMBOL,
				SOLANA_MAINNET_NETWORK_SYMBOL
			]);
		});
	});

	describe('with XRP enabled', () => {
		beforeEach(() => {
			mocks.xrpMainnetEnabled = true;
		});

		afterEach(() => {
			mocks.xrpMainnetEnabled = false;
		});

		it('should include the XRP symbol in enabledNetworksSymbols', async () => {
			const { XRP_MAINNET_NETWORK_SYMBOL } = await import('$env/networks/networks.xrp.env');

			expect(get(enabledNetworksSymbols)).toContain(XRP_MAINNET_NETWORK_SYMBOL);
		});

		it('should keep the other network symbols alongside XRP', () => {
			const symbols = get(enabledNetworksSymbols);

			expect(symbols).toContain(BTC_MAINNET_NETWORK_SYMBOL);
			expect(symbols).toContain(ETHEREUM_NETWORK_SYMBOL);
			expect(symbols).toContain(SOLANA_MAINNET_NETWORK_SYMBOL);
		});

		it('should report networkXrpMainnetEnabled as true', () => {
			expect(get(networkXrpMainnetEnabled)).toBeTruthy();
		});
	});

	// `networkXrpMainnetEnabled` is what gates the XRP branch of the initial loader.
	describe('with XRP disabled', () => {
		it('should not include the XRP symbol in enabledNetworksSymbols', async () => {
			const { XRP_MAINNET_NETWORK_SYMBOL } = await import('$env/networks/networks.xrp.env');

			expect(get(enabledNetworksSymbols)).not.toContain(XRP_MAINNET_NETWORK_SYMBOL);
		});

		it('should report networkXrpMainnetEnabled as false', () => {
			expect(get(networkXrpMainnetEnabled)).toBeFalsy();
		});
	});
});
