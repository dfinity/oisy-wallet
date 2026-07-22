// QuickNode tokens are bound to their endpoint subdomain, so a build using its
// own token (e.g. the mobile POC) must override the host too — `||` (not `??`)
// because CI injects an empty string when the override secret is unset.
export const QUICKNODE_API_URL_MAINNET =
	import.meta.env.VITE_QUICKNODE_API_URL_MAINNET ||
	'https://burned-little-dinghy.solana-mainnet.quiknode.pro/';
export const QUICKNODE_API_URL_DEVNET =
	import.meta.env.VITE_QUICKNODE_API_URL_DEVNET ||
	'https://burned-little-dinghy.solana-devnet.quiknode.pro/';

export const QUICKNODE_API_KEY = import.meta.env.VITE_QUICKNODE_API_KEY;
