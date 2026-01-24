import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { SLVON_TOKEN_GROUP } from '$env/tokens/groups/groups.slvon.env';
import slvon from '$eth/assets/slvon.webp';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SLVON_DECIMALS = 18;

export const SLVON_SYMBOL = 'SLVon';

export const SLVON_TOKEN_ID: TokenId = parseTokenId(SLVON_SYMBOL);

export const SLVON_TOKEN: RequiredEvmBep20Token = {
	id: SLVON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'iShares Silver Trust (Ondo Tokenized Stock)',
	symbol: SLVON_SYMBOL,
	decimals: SLVON_DECIMALS,
	icon: slvon,
	address: '0x8b872732b07be325a8803cdb480d9d20b6f8d11b',
	exchange: 'erc20',
	groupData: SLVON_TOKEN_GROUP
};
