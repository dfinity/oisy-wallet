export const CKBTC_EXPLORER_URL: string | '' | undefined | null = import.meta.env
	.VITE_CKBTC_EXPLORER_URL;

const EXPLORER_URLS = {
	ETHEREUM: 'https://etherscan.io',
	SEPOLIA: 'https://sepolia.etherscan.io',
	ICP: 'https://dashboard.internetcomputer.org',
	CKETH: 'https://dashboard.internetcomputer.org/ethereum',
	BTC_MAINNET: "https://blockstream.info",
	BTC_TESTNET: "https://blockstream.info/testnet"
};

export const {
	ETHEREUM: ETHEREUM_EXPLORER_URL,
	SEPOLIA: SEPOLIA_EXPLORER_URL,
	ICP: ICP_EXPLORER_URL,
	CKETH: CKETH_EXPLORER_URL,
	BTC_MAINNET: BTC_MAINNET_EXPLORER_URL,
	BTC_TESTNET: BTC_TESTNET_EXPLORER_URL
} = EXPLORER_URLS;
