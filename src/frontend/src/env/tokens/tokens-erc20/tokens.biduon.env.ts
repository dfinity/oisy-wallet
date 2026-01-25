import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { BIDUON_TOKEN_GROUP } from '$env/tokens/groups/groups.biduon.env';
import biduon from '$eth/assets/biduon.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const BIDUON_DECIMALS = 18;

const BIDUON_SYMBOL = 'BIDUon';

export const BIDUON_TOKEN_ID: TokenId = parseTokenId(BIDUON_SYMBOL);

export const BIDUON_TOKEN: RequiredAdditionalErc20Token = {
	id: BIDUON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Baidu (Ondo Tokenized)',
	symbol: BIDUON_SYMBOL,
	decimals: BIDUON_DECIMALS,
	icon: biduon,
	address: '0x9d4C6AD12B55E4645b585209F90Cc26614061E91',
	exchange: 'erc20',
	groupData: BIDUON_TOKEN_GROUP
};
