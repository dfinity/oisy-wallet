import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import paxg from '$eth/assets/paxg.png';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const PAXG_DECIMALS = 18;

const PAXG_SYMBOL = 'PAXG';

export const PAXG_TOKEN_ID: TokenId = parseTokenId(PAXG_SYMBOL);

export const PAXG_TOKEN: RequiredAdditionalErc20Token = {
	id: PAXG_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.COMMODITY }],
	name: 'Paxos Gold',
	symbol: PAXG_SYMBOL,
	decimals: PAXG_DECIMALS,
	icon: paxg,
	address: '0x45804880De22913dAFE09f4980848ECE6EcbAf78'
};
