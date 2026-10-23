import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const CRM_DECIMALS = 18;

export const CRM_SYMBOL = 'CRM';

export const CRM_TOKEN_ID: TokenId = parseTokenId(CRM_SYMBOL);

export const CRM_TOKEN: RequiredEvmErc20Token = {
	id: CRM_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Salesforce • Robinhood Token',
	symbol: CRM_SYMBOL,
	decimals: CRM_DECIMALS,
	icon: robinhoodstock,
	address: '0xd95B44124e475743a7589e68F3D74008A5536D44'
};
