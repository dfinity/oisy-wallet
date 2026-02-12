import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { EEMON_TOKEN_GROUP } from '$env/tokens/groups/groups.eemon.env';
import iSharesPurple from '$eth/assets/ishares_purple.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const EEMON_DECIMALS = 18;

const EEMON_SYMBOL = 'EEMon';

export const EEMON_TOKEN_ID: TokenId = parseTokenId(EEMON_SYMBOL);

export const EEMON_TOKEN: RequiredAdditionalErc20Token = {
	id: EEMON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'iShares MSCI Emerging Markets ETF (Ondo Tokenized)',
	symbol: EEMON_SYMBOL,
	decimals: EEMON_DECIMALS,
	icon: iSharesPurple,
	address: '0x77A1a02e4a888ADA8620b93C30dE8a41E621126c',
	groupData: EEMON_TOKEN_GROUP
};
