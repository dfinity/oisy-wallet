import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { PBRON_TOKEN_GROUP } from '$env/tokens/groups/groups.pbron.env';
import pbron from '$eth/assets/pbron.webp';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const PBRON_DECIMALS = 18;

export const PBRON_SYMBOL = 'PBRon';

export const PBRON_TOKEN_ID: TokenId = parseTokenId(PBRON_SYMBOL);

export const PBRON_TOKEN: RequiredEvmBep20Token = {
	id: PBRON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Petrobras (Ondo Tokenized)',
	symbol: PBRON_SYMBOL,
	decimals: PBRON_DECIMALS,
	icon: pbron,
	address: '0x2b1d5cDeCC356530a746C5754231EfaEAca64022',
	exchange: 'erc20',
	groupData: PBRON_TOKEN_GROUP
};
