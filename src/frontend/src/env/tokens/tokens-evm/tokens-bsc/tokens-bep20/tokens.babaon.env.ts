import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { BABAON_TOKEN_GROUP } from '$env/tokens/groups/groups.babaon.env';
import babaon from '$eth/assets/babaon.webp';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const BABAON_DECIMALS = 18;

export const BABAON_SYMBOL = 'BABAon';

export const BABAON_TOKEN_ID: TokenId = parseTokenId(BABAON_SYMBOL);

export const BABAON_TOKEN: RequiredEvmBep20Token = {
	id: BABAON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Alibaba (Ondo Tokenized)',
	symbol: BABAON_SYMBOL,
	decimals: BABAON_DECIMALS,
	icon: babaon,
	address: '0xd5964f3fcee8D649995AB88F04b8982539c282D2',
	exchange: 'erc20',
	groupData: BABAON_TOKEN_GROUP
};
