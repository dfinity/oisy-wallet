import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SLVON_TOKEN_GROUP } from '$env/tokens/groups/groups.slvon.env';
import isharesRed from '$eth/assets/ishares_red.webp';
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
	icon: isharesRed,
	address: '0xF3e4872e6a4cF365888D93b6146a2bAA7348F1A4',
	groupData: SLVON_TOKEN_GROUP
};
