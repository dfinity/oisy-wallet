import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { PBRON_TOKEN_GROUP } from '$env/tokens/groups/groups.pbron.env';
import pbron from '$eth/assets/pbron.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const PBRON_DECIMALS = 18;

const PBRON_SYMBOL = 'PBRon';

export const PBRON_TOKEN_ID: TokenId = parseTokenId(PBRON_SYMBOL);

export const PBRON_TOKEN: RequiredAdditionalErc20Token = {
	id: PBRON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Petrobras (Ondo Tokenized)',
	symbol: PBRON_SYMBOL,
	decimals: PBRON_DECIMALS,
	icon: pbron,
	address: '0xD08DDb436e731f32455Fe302723eE0FD2E9E8706',
	groupData: PBRON_TOKEN_GROUP
};
