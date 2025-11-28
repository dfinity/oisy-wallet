import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ZCHF_TOKEN_GROUP } from '$env/tokens/groups/groups.zchf.env';
import zchf from '$eth/assets/zchf.webp';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const ZCHF_DECIMALS = 18;

export const ZCHF_SYMBOL = 'ZCHF';

export const ZCHF_TOKEN_ID: TokenId = parseTokenId(ZCHF_SYMBOL);

export const ZCHF_TOKEN: RequiredEvmBep20Token = {
	id: ZCHF_TOKEN_ID,
	network: POLYGON_MAINNET_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Frankencoin',
	symbol: ZCHF_SYMBOL,
	decimals: ZCHF_DECIMALS,
	icon: zchf,
	address: '0x02567e4b14b25549331fcee2b56c647a8bab16fd',
	exchange: 'erc20',
	groupData: ZCHF_TOKEN_GROUP
};
