export enum AppPath {
	Tokens = '/',
	Nfts = '/nfts/',
	Explore = '/explore/',
	Settings = '/settings/',
	Transactions = '/transactions/',
	Activity = '/activity/',
	WalletConnect = '/wc/',
	Rewards = '/rewards/', // Todo: remove when feature is completed
	Earning = '/earning/',
	EarningGold = '/earning/gold/',
	EarningRewards = '/earning/rewards/'
}

// SvelteKit uses the group defined in src/routes/(app)/ as part of the routeId. It also prefixes it with /.
export const ROUTE_ID_GROUP_APP = '/(app)';

export const TOKEN_PARAM = 'token';
export const NETWORK_PARAM = 'network';
export const URI_PARAM = 'uri';
