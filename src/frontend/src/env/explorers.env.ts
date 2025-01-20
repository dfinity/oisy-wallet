const EXPLORER_URLS = {
	ETHEREUM: 'https://etherscan.io',
	SEPOLIA: 'https://sepolia.etherscan.io',
	ICP: 'https://dashboard.internetcomputer.org',
	CKETH: 'https://dashboard.internetcomputer.org/ethereum',
	CKETH_SEPOLIA: 'https://dashboard.internetcomputer.org/sepoliaeth',
	CKBTC: 'https://dashboard.internetcomputer.org/bitcoin',
	CKBTC_TESTNET: 'https://dashboard.internetcomputer.org/testbtc',
	SNS: 'https://dashboard.internetcomputer.org/sns',
	BTC_MAINNET: 'https://blockstream.info',
	BTC_TESTNET: 'https://blockstream.info/testnet',
	BTC_REGTEST: 'https://blockstream.regtest.trustless.computer/regtest',
	SOL_MAINNET: 'https://solscan.io/$args',
	SOL_TESTNET: 'https://solscan.io/$args?cluster=testnet',
	SOL_DEVNET: 'https://solscan.io/$args?cluster=devnet'
};

export const {
	ETHEREUM: ETHEREUM_EXPLORER_URL,
	SEPOLIA: SEPOLIA_EXPLORER_URL,
	ICP: ICP_EXPLORER_URL,
	CKETH: CKETH_EXPLORER_URL,
	CKETH_SEPOLIA: CKETH_SEPOLIA_EXPLORER_URL,
	CKBTC: CKBTC_EXPLORER_URL,
	CKBTC_TESTNET: CKBTC_TESTNET_EXPLORER_URL,
	SNS: SNS_EXPLORER_URL,
	BTC_MAINNET: BTC_MAINNET_EXPLORER_URL,
	BTC_TESTNET: BTC_TESTNET_EXPLORER_URL,
	BTC_REGTEST: BTC_REGTEST_EXPLORER_URL,
	SOL_MAINNET: SOL_MAINNET_EXPLORER_URL,
	SOL_TESTNET: SOL_TESTNET_EXPLORER_URL,
	SOL_DEVNET: SOL_DEVNET_EXPLORER_URL
} = EXPLORER_URLS;
