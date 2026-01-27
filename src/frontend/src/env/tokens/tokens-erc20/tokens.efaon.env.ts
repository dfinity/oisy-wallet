import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { EFAON_TOKEN_GROUP } from '$env/tokens/groups/groups.efaon.env';
import iSharesPurple from '$eth/assets/ishares_purple.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const EFAON_DECIMALS = 18;

const EFAON_SYMBOL = 'EFAon';

export const EFAON_TOKEN_ID: TokenId = parseTokenId(EFAON_SYMBOL);

export const EFAON_TOKEN: RequiredAdditionalErc20Token = {
	id: EFAON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'iShares MSCI EAFE ETF (Ondo Tokenized)',
	symbol: EFAON_SYMBOL,
	decimals: EFAON_DECIMALS,
	icon: iSharesPurple,
	address: '0x4111b60bc87F2Bd1e81E783E271D7F0ec6EE088B',
	exchange: 'erc20',
	groupData: EFAON_TOKEN_GROUP
};
