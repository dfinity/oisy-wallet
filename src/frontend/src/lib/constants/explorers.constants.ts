export const BITCOIN_EXPLORER_URL: string | '' | undefined | null = import.meta.env
	.VITE_BITCOIN_EXPLORER_URL;
export const ICP_EXPLORER_URL: string | '' | undefined | null = import.meta.env
	.VITE_ICP_EXPLORER_URL;
export const CKBTC_EXPLORER_URL: string | '' | undefined | null = import.meta.env
	.VITE_CKBTC_EXPLORER_URL;
export const CKETH_EXPLORER_URL: string | '' | undefined | null = import.meta.env
	.VITE_CKETH_EXPLORER_URL;

export const EXPLORER_URLS = {
	ETHEREUM: 'https://etherscan.io',
	SEPOLIA: 'https://sepolia.etherscan.io'
};

export const { ETHEREUM: ETHEREUM_EXPLORER_URL, SEPOLIA: SEPOLIA_EXPLORER_URL } = EXPLORER_URLS;
