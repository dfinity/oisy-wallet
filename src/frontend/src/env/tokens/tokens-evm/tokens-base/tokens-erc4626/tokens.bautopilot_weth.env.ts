import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { WETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.weth.env';
import type { RequiredErc4626Token } from '$eth/types/erc4626';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const BAUTOPILOT_WETH_DECIMALS = 20;

export const BAUTOPILOT_WETH_SYMBOL = 'bAutopilot_wETH';

export const BAUTOPILOT_WETH_TOKEN_ID: TokenId = parseTokenId(BAUTOPILOT_WETH_SYMBOL);

export const BAUTOPILOT_WETH_TOKEN: RequiredErc4626Token = {
	id: BAUTOPILOT_WETH_TOKEN_ID,
	network: BASE_NETWORK,
	standard: { code: 'erc4626' },
	category: 'default',
	name: 'Autopilot wETH Base',
	symbol: BAUTOPILOT_WETH_SYMBOL,
	decimals: BAUTOPILOT_WETH_DECIMALS,
	// TODO: add custom icon
	icon: '',
	address: '0x7872893e528Fe2c0829e405960db5B742112aa97',
	assetAddress: WETH_TOKEN.address,
	assetDecimals: WETH_TOKEN.decimals
};
