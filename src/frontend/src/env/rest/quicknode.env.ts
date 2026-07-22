import { notEmptyString } from '@dfinity/utils';

// QuickNode tokens are bound to their endpoint subdomain, so a build using its
// own token (e.g. the mobile POC) must override the host too. `notEmptyString`
// because CI injects an empty string when the override secret is unset.
const mainnetUrlOverride = import.meta.env.VITE_QUICKNODE_API_URL_MAINNET;
const devnetUrlOverride = import.meta.env.VITE_QUICKNODE_API_URL_DEVNET;

export const QUICKNODE_API_URL_MAINNET = notEmptyString(mainnetUrlOverride)
	? mainnetUrlOverride
	: 'https://burned-little-dinghy.solana-mainnet.quiknode.pro/';
export const QUICKNODE_API_URL_DEVNET = notEmptyString(devnetUrlOverride)
	? devnetUrlOverride
	: 'https://burned-little-dinghy.solana-devnet.quiknode.pro/';

export const QUICKNODE_API_KEY = import.meta.env.VITE_QUICKNODE_API_KEY;
