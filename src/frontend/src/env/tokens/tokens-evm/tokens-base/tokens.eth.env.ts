import {
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import eth from '$icp-eth/assets/eth.svg';
import type { RequiredToken, TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const BASE_ETHEREUM_DEFAULT_DECIMALS = 18;

const BASE_ETHEREUM_SYMBOL = 'ETH';

export const BASE_ETHEREUM_TOKEN_ID: TokenId = parseTokenId(BASE_ETHEREUM_SYMBOL);

export const BASE_ETHEREUM_TOKEN: RequiredToken = {
	id: BASE_ETHEREUM_TOKEN_ID,
	network: BASE_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'Ethereum',
	symbol: BASE_ETHEREUM_SYMBOL,
	decimals: BASE_ETHEREUM_DEFAULT_DECIMALS,
	icon: eth,
	buy: {
		onramperId: 'eth_base'
	}
};

export const BASE_SEPOLIA_SYMBOL = 'SepoliaETH';

export const BASE_SEPOLIA_TOKEN_ID: TokenId = parseTokenId(BASE_SEPOLIA_SYMBOL);

export const BASE_SEPOLIA_TOKEN: RequiredToken = {
	id: BASE_SEPOLIA_TOKEN_ID,
	network: BASE_SEPOLIA_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'SepoliaETH',
	symbol: BASE_SEPOLIA_SYMBOL,
	decimals: BASE_ETHEREUM_DEFAULT_DECIMALS,
	icon: eth
};
