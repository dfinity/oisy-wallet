import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ARMON_TOKEN_GROUP } from '$env/tokens/groups/groups.armon.env';
import armon from '$eth/assets/armon.png';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const ARMON_DECIMALS = 18;

const ARMON_SYMBOL = 'ARMon';

export const ARMON_TOKEN_ID: TokenId = parseTokenId(ARMON_SYMBOL);

export const ARMON_TOKEN: RequiredAdditionalErc20Token = {
	id: ARMON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Arm Holdings plc (Ondo Tokenized)',
	symbol: ARMON_SYMBOL,
	decimals: ARMON_DECIMALS,
	icon: armon,
	address: '0x5Bf1b2A808598C0eF4Af1673a5457d86fE6d7B3d',
	exchange: 'erc20',
	groupData: ARMON_TOKEN_GROUP
};
