import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { IAUON_TOKEN_GROUP } from '$env/tokens/groups/groups.iauon.env';
import isharesRed from '$eth/assets/ishares_red.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const IAUON_DECIMALS = 18;

const IAUON_SYMBOL = 'IAUon';

export const IAUON_TOKEN_ID: TokenId = parseTokenId(IAUON_SYMBOL);

export const IAUON_TOKEN: RequiredAdditionalErc20Token = {
	id: IAUON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'iShares Gold Trust (Ondo Tokenized)',
	symbol: IAUON_SYMBOL,
	decimals: IAUON_DECIMALS,
	icon: isharesRed,
	address: '0x4f0CA3df1c2e6b943cf82E649d576ffe7B2fABCF',
	groupData: IAUON_TOKEN_GROUP
};
