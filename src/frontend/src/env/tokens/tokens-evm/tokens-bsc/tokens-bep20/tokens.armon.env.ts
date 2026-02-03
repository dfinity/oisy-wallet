import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { ARMON_TOKEN_GROUP } from '$env/tokens/groups/groups.armon.env';
import armon from '$eth/assets/armon.png';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const ARMON_DECIMALS = 18;

export const ARMON_SYMBOL = 'ARMon';

export const ARMON_TOKEN_ID: TokenId = parseTokenId(ARMON_SYMBOL);

export const ARMON_TOKEN: RequiredEvmBep20Token = {
	id: ARMON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Arm Holdings plc (Ondo Tokenized)',
	symbol: ARMON_SYMBOL,
	decimals: ARMON_DECIMALS,
	icon: armon,
	address: '0x527C6436E1eAa4f2065CDE4090F798Cb5D031dD6',
	exchange: 'erc20',
	groupData: ARMON_TOKEN_GROUP
};
