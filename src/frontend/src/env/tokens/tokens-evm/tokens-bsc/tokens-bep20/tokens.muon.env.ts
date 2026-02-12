import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { MUON_TOKEN_GROUP } from '$env/tokens/groups/groups.muon.env';
import muon from '$eth/assets/muon.png';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const MUON_DECIMALS = 18;

export const MUON_SYMBOL = 'MUon';

export const MUON_TOKEN_ID: TokenId = parseTokenId(MUON_SYMBOL);

export const MUON_TOKEN: RequiredEvmBep20Token = {
	id: MUON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Micron Technology (Ondo Tokenized)',
	symbol: MUON_SYMBOL,
	decimals: MUON_DECIMALS,
	icon: muon,
	address: '0x8b6ACf6041A81567f012Ff6A4C6D96d5818d74bF',
	groupData: MUON_TOKEN_GROUP
};
