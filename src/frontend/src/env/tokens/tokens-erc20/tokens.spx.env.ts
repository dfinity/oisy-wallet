import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SPX_TOKEN_GROUP } from '$env/tokens/groups/groups.spx.env';
import spx from '$eth/assets/spx.png';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const SPX_DECIMALS = 18;

const SPX_SYMBOL = 'SPX';

export const SPX_TOKEN_ID: TokenId = parseTokenId(SPX_SYMBOL);

export const SPX_TOKEN: RequiredAdditionalErc20Token = {
	id: SPX_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Arbitrum',
	symbol: SPX_SYMBOL,
	decimals: SPX_DECIMALS,
	icon: spx,
	address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
	exchange: 'erc20',
	groupData: SPX_TOKEN_GROUP
};
