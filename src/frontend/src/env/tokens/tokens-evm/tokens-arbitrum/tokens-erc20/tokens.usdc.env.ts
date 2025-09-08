import {
	ARBITRUM_MAINNET_NETWORK,
	ARBITRUM_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { USDC_TOKEN_GROUP } from '$env/tokens/groups/groups.usdc.env';
import usdc from '$eth/assets/usdc.svg';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const USDC_DECIMALS = 6;

export const USDC_SYMBOL = 'USDC';

export const USDC_TOKEN_ID: TokenId = parseTokenId(USDC_SYMBOL);

export const USDC_TOKEN: RequiredEvmErc20Token = {
	id: USDC_TOKEN_ID,
	network: ARBITRUM_MAINNET_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USD Coin',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
	exchange: 'erc20',
	groupData: USDC_TOKEN_GROUP,
	buy: {
		onramperId: 'usdc_arbitrum'
	}
};

export const ARB_SEPOLIA_USDC_SYMBOL = 'SepoliaUSDC';

export const ARB_SEPOLIA_USDC_TOKEN_ID: TokenId = parseTokenId(ARB_SEPOLIA_USDC_SYMBOL);

export const ARB_SEPOLIA_USDC_TOKEN: RequiredEvmErc20Token = {
	id: ARB_SEPOLIA_USDC_TOKEN_ID,
	network: ARBITRUM_SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USDC (Sepolia Testnet)',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
	exchange: 'erc20'
};
