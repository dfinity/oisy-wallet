import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { AMDON_TOKEN_GROUP } from '$env/tokens/groups/groups.amdon.env';
import amdon from '$eth/assets/amdon.webp';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const AMDON_DECIMALS = 18;

export const AMDON_SYMBOL = 'AMDon';

export const AMDON_TOKEN_ID: TokenId = parseTokenId(AMDON_SYMBOL);

export const AMDON_TOKEN: RequiredEvmBep20Token = {
	id: AMDON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'AMD (Ondo Tokenized Stock)',
	symbol: AMDON_SYMBOL,
	decimals: AMDON_DECIMALS,
	icon: amdon,
	address: '0x9f16E46c73b43BDB70861247d537bEE4eA18F639',
	groupData: AMDON_TOKEN_GROUP
};
