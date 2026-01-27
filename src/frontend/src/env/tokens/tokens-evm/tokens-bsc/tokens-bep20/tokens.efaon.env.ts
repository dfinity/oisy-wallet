import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { EFAON_TOKEN_GROUP } from '$env/tokens/groups/groups.efaon.env';
import iSharesPurple from '$eth/assets/ishares_purple.webp';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const EFAON_DECIMALS = 18;

export const EFAON_SYMBOL = 'EFAon';

export const EFAON_TOKEN_ID: TokenId = parseTokenId(EFAON_SYMBOL);

export const EFAON_TOKEN: RequiredEvmBep20Token = {
	id: EFAON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'iShares MSCI EAFE ETF (Ondo Tokenized)',
	symbol: EFAON_SYMBOL,
	decimals: EFAON_DECIMALS,
	icon: iSharesPurple,
	address: '0x38B9A53bfDc5dba58a29bD6992341927C2fca637',
	exchange: 'erc20',
	groupData: EFAON_TOKEN_GROUP
};
