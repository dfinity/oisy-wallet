import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const TEAM_DECIMALS = 18;

export const TEAM_SYMBOL = 'TEAM';

export const TEAM_TOKEN_ID: TokenId = parseTokenId(TEAM_SYMBOL);

export const TEAM_TOKEN: RequiredEvmErc20Token = {
	id: TEAM_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Atlassian Corporation • Robinhood Token',
	symbol: TEAM_SYMBOL,
	decimals: TEAM_DECIMALS,
	icon: robinhoodstock,
	address: '0x5B97476b922F3305131B8f0B9D333172E87f4aaE'
};
