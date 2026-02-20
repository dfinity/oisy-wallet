import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { BOB_TOKEN_GROUP } from '$env/tokens/groups/groups.bob.env';
import bob from '$eth/assets/bob.png';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const BOB_DECIMALS = 8;

const BOB_SYMBOL = 'BOB';

export const BOB_TOKEN_ID: TokenId = parseTokenId(BOB_SYMBOL);

export const BOB_TOKEN: RequiredAdditionalErc20Token = {
	id: BOB_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'BOB',
	symbol: BOB_SYMBOL,
	decimals: BOB_DECIMALS,
	icon: bob,
	address: '0xecc5f868AdD75F4ff9FD00bbBDE12C35BA2C9C89',
	groupData: BOB_TOKEN_GROUP
};
