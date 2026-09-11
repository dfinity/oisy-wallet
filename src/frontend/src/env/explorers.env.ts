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
	SOL_DEVNET: 'https://solscan.io/$args?cluster=devnet',
	BASE: 'https://basescan.org',
	BASE_SEPOLIA: 'https://sepolia.basescan.org',
	BSC: 'https://bscscan.com',
	BSC_TESTNET: 'https://testnet.bscscan.com',
	POLYGON: 'https://polygonscan.com',
	POLYGON_AMOY: 'https://amoy.polygonscan.com/',
	ARBITRUM: 'https://arbiscan.io',
	ARBITRUM_SEPOLIA: 'https://sepolia.arbiscan.io'
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
	SOL_DEVNET: SOL_DEVNET_EXPLORER_URL,
	BASE: BASE_EXPLORER_URL,
	BASE_SEPOLIA: BASE_SEPOLIA_EXPLORER_URL,
	BSC: BSC_EXPLORER_URL,
	BSC_TESTNET: BSC_TESTNET_EXPLORER_URL,
	POLYGON: POLYGON_EXPLORER_URL,
	POLYGON_AMOY: POLYGON_AMOY_EXPLORER_URL,
	ARBITRUM: ARBITRUM_EXPLORER_URL,
	ARBITRUM_SEPOLIA: ARBITRUM_SEPOLIA_EXPLORER_URL
} = EXPLORER_URLS;

// Explorers run by the third-party providers OISY routes swaps and bridge transfers
// through. Unlike the chain explorers above, these show provider-internal settlement
// state - the phase a cross-chain transfer is in before either chain shows anything.
// Kept here so every explorer host the frontend knows about lives in one file.
const PROVIDER_EXPLORER_URLS = {
	VELORA: 'https://explorer.velora.xyz',
	NEAR_INTENTS: 'https://explorer.near-intents.org',
	ONESEC: 'https://1sec.to'
};

export const {
	VELORA: VELORA_EXPLORER_URL,
	NEAR_INTENTS: NEAR_INTENTS_EXPLORER_URL,
	ONESEC: ONESEC_EXPLORER_URL
} = PROVIDER_EXPLORER_URLS;

// Explorers used to look up a whole ADDRESS, where the network's own `explorerUrl`
// above cannot serve one. Everything else reuses that URL, so these two are the
// exception rather than a second set.
//
// ICP: `dashboard.internetcomputer.org` keys its account page by the 64-character
// account identifier, and the address OISY shows a user is their principal - which
// only icexplorer resolves. BTC: blockstream would work; mempool.space is the one
// this wallet points a user at for their own address.
const ADDRESS_EXPLORER_URLS = {
	ICP: 'https://www.icexplorer.io',
	BTC_MAINNET: 'https://mempool.space'
};

export const { ICP: ICP_ADDRESS_EXPLORER_URL, BTC_MAINNET: BTC_MAINNET_ADDRESS_EXPLORER_URL } =
	ADDRESS_EXPLORER_URLS;
