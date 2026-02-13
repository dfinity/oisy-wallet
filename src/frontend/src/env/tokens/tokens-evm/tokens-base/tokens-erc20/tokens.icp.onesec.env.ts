import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ICP_ONESEC_TOKEN_GROUP } from '$env/tokens/groups/groups.icp.onesec.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import icpOnesec from '$icp/assets/icp-onesec.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const ICP_ONESEC_DECIMALS = 8;

const ICP_ONESEC_SYMBOL = 'ICP';

export const ICP_ONESEC_TOKEN_ID: TokenId = parseTokenId(ICP_ONESEC_SYMBOL);

export const ICP_ONESEC_TOKEN: RequiredEvmErc20Token = {
	id: ICP_ONESEC_TOKEN_ID,
	network: BASE_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'ICP (Onesec)',
	symbol: ICP_ONESEC_SYMBOL,
	decimals: ICP_ONESEC_DECIMALS,
	icon: icpOnesec,
	address: '0x00f3C42833C3170159af4E92dbb451Fb3F708917',
	groupData: ICP_ONESEC_TOKEN_GROUP
};
