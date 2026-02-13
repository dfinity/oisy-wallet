import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { BIDUON_TOKEN_GROUP } from '$env/tokens/groups/groups.biduon.env';
import biduon from '$eth/assets/biduon.webp';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const BIDUON_DECIMALS = 18;

export const BIDUON_SYMBOL = 'BIDUon';

export const BIDUON_TOKEN_ID: TokenId = parseTokenId(BIDUON_SYMBOL);

export const BIDUON_TOKEN: RequiredEvmBep20Token = {
	id: BIDUON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Baidu (Ondo Tokenized)',
	symbol: BIDUON_SYMBOL,
	decimals: BIDUON_DECIMALS,
	icon: biduon,
	address: '0x467e59ce5D5fe01686D4A80dd1E1DAE13549AA6c',
	groupData: BIDUON_TOKEN_GROUP
};
