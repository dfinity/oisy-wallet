import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { COPXON_TOKEN_GROUP } from '$env/tokens/groups/groups.copxon.env';
import copxon from '$eth/assets/copxon.webp';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const COPXON_DECIMALS = 18;

export const COPXON_SYMBOL = 'COPXon';

export const COPXON_TOKEN_ID: TokenId = parseTokenId(COPXON_SYMBOL);

export const COPXON_TOKEN: RequiredEvmBep20Token = {
	id: COPXON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Global X Copper Miners ETF (Ondo Tokenized)',
	symbol: COPXON_SYMBOL,
	decimals: COPXON_DECIMALS,
	icon: copxon,
	address: '0xEC93fE7Ff4B09CA3CCAFBc4CC9615E62BE412780',
	groupData: COPXON_TOKEN_GROUP
};
