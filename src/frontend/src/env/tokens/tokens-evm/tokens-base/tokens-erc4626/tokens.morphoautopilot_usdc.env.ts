import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import autopilotusdc from '$eth/assets/autopilotusdc.webp';
import type { RequiredErc4626Token } from '$eth/types/erc4626';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const MORPHOAUTOPILOT_USDC_DECIMALS = 8;

export const MORPHOAUTOPILOT_USDC_SYMBOL = 'morphoAutopilotUSDC_base';

export const MORPHOAUTOPILOT_USDC_TOKEN_ID: TokenId = parseTokenId(MORPHOAUTOPILOT_USDC_SYMBOL);

export const MORPHOAUTOPILOT_USDC_TOKEN: RequiredErc4626Token = {
	id: MORPHOAUTOPILOT_USDC_TOKEN_ID,
	network: BASE_NETWORK,
	standard: { code: 'erc4626' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }],
	name: 'Autopilot USDC Morpho (Base)',
	symbol: MORPHOAUTOPILOT_USDC_SYMBOL,
	decimals: MORPHOAUTOPILOT_USDC_DECIMALS,
	icon: autopilotusdc,
	address: '0xd6701905c59EE618dc36DC747506BCE0a4AC760A',
	assetAddress: USDC_TOKEN.address,
	assetDecimals: USDC_TOKEN.decimals,
	assetIcon: USDC_TOKEN.icon,
	assetSymbol: USDC_TOKEN.symbol
};
