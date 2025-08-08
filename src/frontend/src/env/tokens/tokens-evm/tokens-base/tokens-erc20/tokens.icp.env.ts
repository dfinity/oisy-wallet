import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ICP_TOKEN_GROUP } from '$env/tokens/groups/groups.icp.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import icp from '$icp/assets/icp-dark.png';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const ICP_DECIMALS = 8;

export const ICP_SYMBOL = 'ICP';

export const ICP_TOKEN_ID: TokenId = parseTokenId(ICP_SYMBOL);

export const ICP_TOKEN: RequiredEvmErc20Token = {
	id: ICP_TOKEN_ID,
	network: BASE_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'ICP',
	symbol: ICP_SYMBOL,
	decimals: ICP_DECIMALS,
	icon: icp,
	address: '0x00f3C42833C3170159af4E92dbb451Fb3F708917',
	exchange: 'erc20',
	groupData: ICP_TOKEN_GROUP
};
