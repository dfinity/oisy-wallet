import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { AMDON_TOKEN_GROUP } from '$env/tokens/groups/groups.amdon.env';
import amdon from '$eth/assets/amdon.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const AMDON_DECIMALS = 18;

const AMDON_SYMBOL = 'AMDon';

export const AMDON_TOKEN_ID: TokenId = parseTokenId(AMDON_SYMBOL);

export const AMDON_TOKEN: RequiredAdditionalErc20Token = {
	id: AMDON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'AMD (Ondo Tokenized Stock)',
	symbol: AMDON_SYMBOL,
	decimals: AMDON_DECIMALS,
	icon: amdon,
	address: '0x0C1f3412A44Ff99E40bF14e06e5Ea321aE7B3938',
	exchange: 'erc20',
	groupData: AMDON_TOKEN_GROUP
};
