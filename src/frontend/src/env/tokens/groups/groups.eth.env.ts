import { ETHEREUM_SYMBOL, SEPOLIA_SYMBOL } from '$env/tokens/tokens.eth.env';
import eth from '$icp-eth/assets/eth.svg';

export const ETHEREUM_TOKEN_GROUP = {
	icon: eth,
	name: 'Ethereum',
	symbol: ETHEREUM_SYMBOL
};

export const SEPOLIA_TOKEN_GROUP = {
	icon: eth,
	name: 'SepoliaETH',
	symbol: SEPOLIA_SYMBOL
};
