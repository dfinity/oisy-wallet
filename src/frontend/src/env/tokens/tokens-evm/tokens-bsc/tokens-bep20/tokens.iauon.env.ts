import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { IAUON_TOKEN_GROUP } from '$env/tokens/groups/groups.iauon.env';
import ishares from '$eth/assets/ishares.webp';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const IAUON_DECIMALS = 18;

export const IAUON_SYMBOL = 'IAUon';

export const IAUON_TOKEN_ID: TokenId = parseTokenId(IAUON_SYMBOL);

export const IAUON_TOKEN: RequiredEvmBep20Token = {
	id: IAUON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'iShares Gold Trust (Ondo Tokenized)',
	symbol: IAUON_SYMBOL,
	decimals: IAUON_DECIMALS,
	icon: ishares,
	address: '0xcB2a0F46f67dC4c58a316F1c008EDef5c2311795',
	exchange: 'erc20',
	groupData: IAUON_TOKEN_GROUP
};
