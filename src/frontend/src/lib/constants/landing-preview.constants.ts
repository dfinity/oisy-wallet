import bitcoin from '$btc/assets/bitcoin.svg?inline';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import usdCoin from '$eth/assets/usdc.svg?inline';
import tetherGold from '$eth/assets/xaut.svg?inline';
import ethereum from '$icp-eth/assets/eth.svg?inline';
import type { CardData } from '$lib/types/token-card';
import nvidia from '$sol/assets/nvdax.svg?inline';
import tesla from '$sol/assets/tslax.svg?inline';

// Sample holdings laid out like the home screen's TokenCard rows; nothing here reads wallet
// state. TokenCard itself waits for the exchange worker, which never starts signed out, so its
// fiat value and 24h change would stay skeletons here.
export const LANDING_HOLD_TOKENS: (CardData & {
	usdBalance: number;
	usdPrice: number;
	usdPriceChangePercentage24h: number;
})[] = [
	{
		name: 'Bitcoin',
		symbol: 'BTC',
		decimals: 8,
		icon: bitcoin,
		network: BTC_MAINNET_NETWORK,
		balance: 42_000_000n,
		usdBalance: 40_385.04,
		usdPrice: 96_154.86,
		usdPriceChangePercentage24h: 1.84
	},
	{
		name: 'Tesla xStock',
		symbol: 'TSLAx',
		decimals: 8,
		icon: tesla,
		network: SOLANA_MAINNET_NETWORK,
		balance: 1_200_000_000n,
		usdBalance: 5_412.0,
		usdPrice: 451.0,
		usdPriceChangePercentage24h: 3.12
	},
	{
		name: 'Ethereum',
		symbol: 'ETH',
		decimals: 18,
		icon: ethereum,
		network: ETHEREUM_NETWORK,
		balance: 1_350_000_000_000_000_000n,
		usdBalance: 4_382.51,
		usdPrice: 3_246.3,
		usdPriceChangePercentage24h: -0.62
	},
	{
		name: 'NVIDIA xStock',
		symbol: 'NVDAx',
		decimals: 8,
		icon: nvidia,
		network: SOLANA_MAINNET_NETWORK,
		balance: 2_000_000_000n,
		usdBalance: 3_640.8,
		usdPrice: 182.04,
		usdPriceChangePercentage24h: 0.94
	},
	{
		name: 'Tether Gold',
		symbol: 'XAUt',
		decimals: 6,
		icon: tetherGold,
		network: ETHEREUM_NETWORK,
		balance: 800_000n,
		usdBalance: 3_312.48,
		usdPrice: 4_140.6,
		usdPriceChangePercentage24h: 0.21
	},
	{
		name: 'USD Coin',
		symbol: 'USDC',
		decimals: 6,
		icon: usdCoin,
		network: ETHEREUM_NETWORK,
		balance: 2_400_000_000n,
		usdBalance: 2_400.0,
		usdPrice: 1,
		usdPriceChangePercentage24h: 0
	}
];

// The Hold preview's total, which the currency preview converts. Rounded to cents, as the summed
// floats are not.
export const LANDING_HOLD_BALANCE_USD =
	Math.round(LANDING_HOLD_TOKENS.reduce((sum, { usdBalance }) => sum + usdBalance, 0) * 100) / 100;
