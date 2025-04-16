import {
	BASE_ETH_SYMBOL,
	BASE_SEPOLIA_ETH_SYMBOL
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import eth from '$icp-eth/assets/eth.svg';

export const BASE_ETH_TOKEN_GROUP = {
	icon: eth,
	name: 'Ethereum',
	symbol: BASE_ETH_SYMBOL
};

export const BASE_SEPOLIA_ETH_TOKEN_GROUP = {
	icon: eth,
	name: 'SepoliaETH',
	symbol: BASE_SEPOLIA_ETH_SYMBOL
};
