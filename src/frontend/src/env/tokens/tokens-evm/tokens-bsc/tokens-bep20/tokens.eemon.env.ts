import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { EEMON_TOKEN_GROUP } from '$env/tokens/groups/groups.eemon.env';
import iSharesPurple from '$eth/assets/ishares_purple.webp';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const EEMON_DECIMALS = 18;

export const EEMON_SYMBOL = 'EEMon';

export const EEMON_TOKEN_ID: TokenId = parseTokenId(EEMON_SYMBOL);

export const EEMON_TOKEN: RequiredEvmBep20Token = {
	id: EEMON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'iShares MSCI Emerging Markets ETF (Ondo Tokenized)',
	symbol: EEMON_SYMBOL,
	decimals: EEMON_DECIMALS,
	icon: iSharesPurple,
	address: '0x00c81d35edDF44c75d4Db9E07bDCdC236eB0ebcf',
	exchange: 'erc20',
	groupData: EEMON_TOKEN_GROUP
};
