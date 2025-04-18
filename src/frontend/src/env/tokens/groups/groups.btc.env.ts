import bitcoin from '$icp/assets/bitcoin.svg';
import bitcoinTestnet from '$icp/assets/bitcoin_testnet.svg';

const BTC_MAINNET_TOKEN_GROUP_SYMBOL = 'BTC';

export const BTC_MAINNET_TOKEN_GROUP = {
	icon: bitcoin,
	name: 'Bitcoin',
	symbol: BTC_MAINNET_TOKEN_GROUP_SYMBOL
};

const BTC_TESTNET_TOKEN_GROUP_SYMBOL = 'BTC (Testnet)';

export const BTC_TESTNET_TOKEN_GROUP = {
	icon: bitcoinTestnet,
	name: 'Bitcoin (Testnet)',
	symbol: BTC_TESTNET_TOKEN_GROUP_SYMBOL
};

const BTC_REGTEST_TOKEN_GROUP_SYMBOL = 'BTC (Regtest)';

export const BTC_REGTEST_TOKEN_GROUP = {
	icon: bitcoinTestnet,
	name: 'Bitcoin (Regtest)',
	symbol: BTC_REGTEST_TOKEN_GROUP_SYMBOL
};
