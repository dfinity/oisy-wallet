export enum AppPath {
	Tokens = '/',
	Nfts = '/nfts/',
	Earning = '/earning/',
	Trading = '/trading/',
	Explore = '/explore/',
	Settings = '/settings/',
	Transactions = '/transactions/',
	Activity = '/activity/',
	WalletConnect = '/wc/',
	Rewards = '/rewards/', // Todo: remove when feature is completed
	Earn = '/earn/',
	EarnAutopilot = '/earn/autopilot/',
	EarnRewards = '/earn/rewards/',
	Borrow = '/borrow/',
	Liabilities = '/liabilities/',
	ProvidersLiquidium = '/providers/liquidium/',
	LicenseAgreement = '/license-agreement/',
	PrivacyPolicy = '/privacy-policy/',
	TermsOfUse = '/terms-of-use/'
}

// SvelteKit uses the group defined in src/routes/(app)/ as part of the routeId. It also prefixes it with /.
export const ROUTE_ID_GROUP_APP = '/(app)';

export const TOKEN_PARAM = 'token';
export const NETWORK_PARAM = 'network';
export const COLLECTION_PARAM = 'collection';
export const NFT_PARAM = 'nft';
export const URI_PARAM = 'uri';
export const VAULT_PARAM = 'vault';

export const PARAM_MSG = 'msg';
export const PARAM_LEVEL = 'level';
export const PARAM_DELETE_IDB_CACHE = 'delete-idb-cache';
