import { AUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-erc4626/tokens.autopilot_usdc.env';
import { AAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc4626/tokens.aautopilot_usdc.env';
import { AAUTOPILOT_WBTC_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc4626/tokens.aautopilot_wbtc.env';
import { AAUTOPILOT_WETH_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc4626/tokens.aautopilot_weth.env';
import { BAUTOPILOT_CBBTC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_cbbtc.env';
import { BAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_usdc.env';
import { BAUTOPILOT_WETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_weth.env';
import { MORPHOAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.morphoautopilot_usdc.env';

export const HARVEST_AUTOPILOT_ADDRESSES = [
	BAUTOPILOT_USDC_TOKEN.address.toLowerCase(),
	BAUTOPILOT_CBBTC_TOKEN.address.toLowerCase(),
	BAUTOPILOT_WETH_TOKEN.address.toLowerCase(),
	MORPHOAUTOPILOT_USDC_TOKEN.address.toLowerCase(),
	AUTOPILOT_USDC_TOKEN.address.toLowerCase(),
	AAUTOPILOT_USDC_TOKEN.address.toLowerCase(),
	AAUTOPILOT_WBTC_TOKEN.address.toLowerCase(),
	AAUTOPILOT_WETH_TOKEN.address.toLowerCase()
];
