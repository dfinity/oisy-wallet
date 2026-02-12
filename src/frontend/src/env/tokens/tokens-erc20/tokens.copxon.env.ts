import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { COPXON_TOKEN_GROUP } from '$env/tokens/groups/groups.copxon.env';
import copxon from '$eth/assets/copxon.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const COPXON_DECIMALS = 18;

const COPXON_SYMBOL = 'COPXon';

export const COPXON_TOKEN_ID: TokenId = parseTokenId(COPXON_SYMBOL);

export const COPXON_TOKEN: RequiredAdditionalErc20Token = {
	id: COPXON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Global X Copper Miners ETF (Ondo Tokenized)',
	symbol: COPXON_SYMBOL,
	decimals: COPXON_DECIMALS,
	icon: copxon,
	address: '0x423A63dfE8d82CD9C6568C92210AA537d8Ef6885',
	groupData: COPXON_TOKEN_GROUP
};
