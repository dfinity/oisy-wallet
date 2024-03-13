export const BITCOIN_EXPLORER_URL: string | '' | undefined | null = import.meta.env
	.VITE_BITCOIN_EXPLORER_URL;
export const CKBTC_EXPLORER_URL: string | '' | undefined | null = import.meta.env
	.VITE_CKBTC_EXPLORER_URL;

const EXPLORER_URLS = {
	ETHEREUM: 'https://etherscan.io',
	SEPOLIA: 'https://sepolia.etherscan.io',
	ICP: 'https://dashboard.internetcomputer.org',
	CKETH: 'https://dashboard.internetcomputer.org/ethereum'
};

export const {
	ETHEREUM: ETHEREUM_EXPLORER_URL,
	SEPOLIA: SEPOLIA_EXPLORER_URL,
	ICP: ICP_EXPLORER_URL,
	CKETH: CKETH_EXPLORER_URL
} = EXPLORER_URLS;
