import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { IVVON_TOKEN_GROUP } from '$env/tokens/groups/groups.ivvon.env';
import isharesPurple from '$eth/assets/ishares_purple.webp';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const IVVON_DECIMALS = 18;

export const IVVON_SYMBOL = 'IVVon';

export const IVVON_TOKEN_ID: TokenId = parseTokenId(IVVON_SYMBOL);

export const IVVON_TOKEN: RequiredEvmBep20Token = {
	id: IVVON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'iShares Core S&P 500 ETF (Ondo Tokenized)',
	symbol: IVVON_SYMBOL,
	decimals: IVVON_DECIMALS,
	icon: isharesPurple,
	address: '0x1104EB7e85E25eB45F88e638b0C27A06C1A91CB2',
	exchange: 'erc20',
	groupData: IVVON_TOKEN_GROUP
};
