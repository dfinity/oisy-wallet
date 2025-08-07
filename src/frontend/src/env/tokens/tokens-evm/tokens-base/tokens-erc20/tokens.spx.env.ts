import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { SPX_TOKEN_GROUP } from '$env/tokens/groups/groups.spx.env';
import spx from '$eth/assets/spx.png';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SPX_DECIMALS = 8;

export const SPX_SYMBOL = 'SPX';

export const SPX_TOKEN_ID: TokenId = parseTokenId(SPX_SYMBOL);

export const SPX_TOKEN: RequiredEvmErc20Token = {
	id: SPX_TOKEN_ID,
	network: BASE_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'SPX6900',
	symbol: SPX_SYMBOL,
	decimals: SPX_DECIMALS,
	icon: spx,
	address: '0x50dA645f148798F68EF2d7dB7C1CB22A6819bb2C',
	exchange: 'erc20',
	groupData: SPX_TOKEN_GROUP
};
