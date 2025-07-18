import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SHIB_TOKEN_GROUP } from '$env/tokens/groups/groups.shib.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import shib from '$icp-eth/assets/shib.svg';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SHIB_DECIMALS = 18;

export const SHIB_SYMBOL = 'SHIB';

export const SHIB_TOKEN_ID: TokenId = parseTokenId(SHIB_SYMBOL);

export const SHIB_TOKEN: RequiredErc20Token = {
	id: SHIB_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'SHIBA INU',
	symbol: SHIB_SYMBOL,
	decimals: SHIB_DECIMALS,
	icon: shib,
	address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
	exchange: 'erc20',
	twinTokenSymbol: 'ckSHIB',
	groupData: SHIB_TOKEN_GROUP,
	alwaysShowInTokenGroup: true,
	buy: {
		onramperId: 'shib_ethereum'
	}
};
