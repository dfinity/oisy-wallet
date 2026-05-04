import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { WBTC_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.wbtc.env';
import autopilotwbtc from '$eth/assets/autopilotwbtc.webp';
import type { RequiredErc4626Token } from '$eth/types/erc4626';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const AAUTOPILOT_WBTC_DECIMALS = 10;

export const AAUTOPILOT_WBTC_SYMBOL = 'aAutopilot_wBTC';

export const AAUTOPILOT_WBTC_TOKEN_ID: TokenId = parseTokenId(AAUTOPILOT_WBTC_SYMBOL);

export const AAUTOPILOT_WBTC_TOKEN: RequiredErc4626Token = {
	id: AAUTOPILOT_WBTC_TOKEN_ID,
	network: ARBITRUM_MAINNET_NETWORK,
	standard: { code: 'erc4626' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
	name: 'Autopilot WBTC Arbitrum',
	symbol: AAUTOPILOT_WBTC_SYMBOL,
	decimals: AAUTOPILOT_WBTC_DECIMALS,
	icon: autopilotwbtc,
	address: '0x49b2248f7a7a703731852db0b2217f40da75b8ab',
	assetAddress: WBTC_TOKEN.address,
	assetDecimals: WBTC_TOKEN.decimals,
	assetIcon: WBTC_TOKEN.icon,
	assetSymbol: WBTC_TOKEN.symbol
};
