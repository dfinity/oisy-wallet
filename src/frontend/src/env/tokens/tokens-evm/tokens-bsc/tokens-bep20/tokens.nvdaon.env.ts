import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { NVDAON_TOKEN_GROUP } from '$env/tokens/groups/groups.nvdaon.env';
import nvdaon from '$eth/assets/nvdaon.svg';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const NVDAON_DECIMALS = 18;

export const NVDAON_SYMBOL = 'NVDAon';

export const NVDAON_TOKEN_ID: TokenId = parseTokenId(NVDAON_SYMBOL);

export const NVDAON_TOKEN: RequiredEvmBep20Token = {
	id: NVDAON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'NVIDIA (Ondo Tokenized)',
	symbol: NVDAON_SYMBOL,
	decimals: NVDAON_DECIMALS,
	icon: nvdaon,
	address: '0xa9ee28c80f960b889dfbd1902055218cba016f75',
	exchange: 'erc20',
	groupData: NVDAON_TOKEN_GROUP
};
