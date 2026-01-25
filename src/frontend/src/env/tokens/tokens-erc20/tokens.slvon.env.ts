import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SLVON_TOKEN_GROUP } from '$env/tokens/groups/groups.slvon.env';
import slvon from '$eth/assets/slvon.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const SLVON_DECIMALS = 18;

const SLVON_SYMBOL = 'SLVon';

export const SLVON_TOKEN_ID: TokenId = parseTokenId(SLVON_SYMBOL);

export const SLVON_TOKEN: RequiredAdditionalErc20Token = {
	id: SLVON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'iShares Silver Trust (Ondo Tokenized Stock)',
	symbol: SLVON_SYMBOL,
	decimals: SLVON_DECIMALS,
	icon: slvon,
	address: '0xf3e4872e6a4cf365888d93b6146a2baa7348f1a4',
	exchange: 'erc20',
	groupData: SLVON_TOKEN_GROUP
};
