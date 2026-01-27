import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { NVDAON_TOKEN_GROUP } from '$env/tokens/groups/groups.nvdaon.env';
import ndvaon from '$eth/assets/nvdaon.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const NVDAON_DECIMALS = 18;

const NVDAON_SYMBOL = 'NVDAon';

export const NVDAON_TOKEN_ID: TokenId = parseTokenId(NVDAON_SYMBOL);

export const NVDAON_TOKEN: RequiredAdditionalErc20Token = {
	id: NVDAON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'NVIDIA (Ondo Tokenized)',
	symbol: NVDAON_SYMBOL,
	decimals: NVDAON_DECIMALS,
	icon: ndvaon,
	address: '0x2D1F7226Bd1F780AF6B9A49DCC0aE00E8Df4bDEE',
	exchange: 'erc20',
	groupData: NVDAON_TOKEN_GROUP
};
