import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { USDE_TOKEN_GROUP } from '$env/tokens/groups/groups.usde.env';
import usde from '$eth/assets/usde.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const USDE_DECIMALS = 18;

export const USDE_SYMBOL = 'USDe';

export const USDE_TOKEN_ID: TokenId = parseTokenId(USDE_SYMBOL);

export const USDE_TOKEN: RequiredEvmErc20Token = {
	id: USDE_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }],
	name: 'Ethena USDe',
	symbol: USDE_SYMBOL,
	decimals: USDE_DECIMALS,
	icon: usde,
	address: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
	groupData: USDE_TOKEN_GROUP
};
