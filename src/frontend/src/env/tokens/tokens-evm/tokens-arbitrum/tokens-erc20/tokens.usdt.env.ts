import {
	ARBITRUM_MAINNET_NETWORK,
	ARBITRUM_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { USDT_TOKEN_GROUP } from '$env/tokens/groups/groups.usdt.env';
import usdt from '$eth/assets/usdt.svg';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const USDT_DECIMALS = 6;

export const USDT_SYMBOL = 'USDT';

export const USDT_TOKEN_ID: TokenId = parseTokenId(USDT_SYMBOL);

export const USDT_TOKEN: RequiredEvmBep20Token = {
	id: USDT_TOKEN_ID,
	network: ARBITRUM_MAINNET_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Tether USD',
	symbol: USDT_SYMBOL,
	decimals: USDT_DECIMALS,
	icon: usdt,
	address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
	exchange: 'erc20',
	groupData: USDT_TOKEN_GROUP,
	buy: {
		onramperId: 'usdt_arbitrum'
	}
};

export const ARB_SEPOLIA_USDT_SYMBOL = 'SepoliaUSDT';

export const ARB_SEPOLIA_USDT_TOKEN_ID: TokenId = parseTokenId(ARB_SEPOLIA_USDT_SYMBOL);

export const ARB_SEPOLIA_USDT_TOKEN: RequiredEvmBep20Token = {
	id: ARB_SEPOLIA_USDT_TOKEN_ID,
	network: ARBITRUM_SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Tether USD (Sepolia Testnet)',
	symbol: USDT_SYMBOL,
	decimals: USDT_DECIMALS,
	icon: usdt,
	address: '0x1be207f7ae412c6deb0505485a36bfbdbd921d89',
	exchange: 'erc20'
};
