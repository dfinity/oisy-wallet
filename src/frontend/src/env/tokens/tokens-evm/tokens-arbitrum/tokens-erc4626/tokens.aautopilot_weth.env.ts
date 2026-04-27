import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { WETH_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.weth.env';
import autopilotweth from '$eth/assets/autopilotweth.webp';
import type { RequiredErc4626Token } from '$eth/types/erc4626';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const AAUTOPILOT_WETH_DECIMALS = 20;

export const AAUTOPILOT_WETH_SYMBOL = 'aAutopilot_wETH';

export const AAUTOPILOT_WETH_TOKEN_ID: TokenId = parseTokenId(AAUTOPILOT_WETH_SYMBOL);

export const AAUTOPILOT_WETH_TOKEN: RequiredErc4626Token = {
	id: AAUTOPILOT_WETH_TOKEN_ID,
	network: ARBITRUM_MAINNET_NETWORK,
	standard: { code: 'erc4626' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
	name: 'Autopilot WETH Arbitrum',
	symbol: AAUTOPILOT_WETH_SYMBOL,
	decimals: AAUTOPILOT_WETH_DECIMALS,
	icon: autopilotweth,
	address: '0xce4d997a3b404f9eaa796f89deae40747d3647b7',
	assetAddress: WETH_TOKEN.address,
	assetDecimals: WETH_TOKEN.decimals,
	assetIcon: WETH_TOKEN.icon,
	assetSymbol: WETH_TOKEN.symbol
};
