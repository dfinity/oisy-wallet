import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { IVVON_TOKEN_GROUP } from '$env/tokens/groups/groups.ivvon.env';
import isharesPurple from '$eth/assets/ishares_purple.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const IVVON_DECIMALS = 18;

const IVVON_SYMBOL = 'IVVon';

export const IVVON_TOKEN_ID: TokenId = parseTokenId(IVVON_SYMBOL);

export const IVVON_TOKEN: RequiredAdditionalErc20Token = {
	id: IVVON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'iShares Core S&P 500 ETF (Ondo Tokenized)',
	symbol: IVVON_SYMBOL,
	decimals: IVVON_DECIMALS,
	icon: isharesPurple,
	address: '0x62cA254a363dc3c748e7E955c20447aB5bF06fF7',
	groupData: IVVON_TOKEN_GROUP
};
