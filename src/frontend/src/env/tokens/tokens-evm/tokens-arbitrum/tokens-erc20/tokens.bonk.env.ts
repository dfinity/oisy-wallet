import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BONK_TOKEN_GROUP } from '$env/tokens/groups/groups.bonk.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import bonk from '$sol/assets/bonk.svg';

export const BONK_DECIMALS = 5;

export const BONK_SYMBOL = 'BONK';

export const BONK_TOKEN_ID: TokenId = parseTokenId(BONK_SYMBOL);

export const BONK_TOKEN: RequiredEvmErc20Token = {
	id: BONK_TOKEN_ID,
	network: ARBITRUM_MAINNET_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Bonk',
	symbol: BONK_SYMBOL,
	decimals: BONK_DECIMALS,
	icon: bonk,
	address: '0x09199d9a5f4448d0848e4395d065e1ad9c4a1f74',
	exchange: 'erc20',
	groupData: BONK_TOKEN_GROUP
};
