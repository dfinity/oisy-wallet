import {
	BTC_MAINNET_SYMBOL,
	BTC_REGTEST_SYMBOL,
	BTC_TESTNET_SYMBOL
} from '$env/tokens/tokens.btc.env';
import bitcoin from '$icp/assets/bitcoin.svg';
import bitcoinTestnet from '$icp/assets/bitcoin_testnet.svg';

export const BTC_MAINNET_TOKEN_GROUP = {
	icon: bitcoin,
	name: 'Bitcoin',
	symbol: BTC_MAINNET_SYMBOL
};

export const BTC_TESTNET_TOKEN_GROUP = {
	icon: bitcoinTestnet,
	name: 'Bitcoin (Testnet)',
	symbol: BTC_TESTNET_SYMBOL
};

export const BTC_REGTEST_TOKEN_GROUP = {
	icon: bitcoinTestnet,
	name: 'Bitcoin (Regtest)',
	symbol: BTC_REGTEST_SYMBOL
};
