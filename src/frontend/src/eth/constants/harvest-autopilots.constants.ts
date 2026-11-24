import { AAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc4626/tokens.aautopilot_usdc.env';
import { AAUTOPILOT_WBTC_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc4626/tokens.aautopilot_wbtc.env';
import { AAUTOPILOT_WETH_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc4626/tokens.aautopilot_weth.env';
import { BAUTOPILOT_CBBTC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_cbbtc.env';
import { BAUTOPILOT_EURC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_eurc.env';
import { BAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_usdc.env';
import { BAUTOPILOT_WETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_weth.env';
import { MORPHOAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.morphoautopilot_usdc.env';
import { ERC4626_TOKENS } from '$env/tokens/tokens.erc4626.env';
import type { RequiredErc4626Token } from '$eth/types/erc4626';
import type { RequiredEvmErc4626Token } from '$evm/types/erc4626';
import { nonNullish } from '@dfinity/utils';

export const HARVEST_AUTOPILOT_ADDRESSES = [
	BAUTOPILOT_EURC_TOKEN.address.toLowerCase(),
	BAUTOPILOT_USDC_TOKEN.address.toLowerCase(),
	BAUTOPILOT_CBBTC_TOKEN.address.toLowerCase(),
	BAUTOPILOT_WETH_TOKEN.address.toLowerCase(),
	MORPHOAUTOPILOT_USDC_TOKEN.address.toLowerCase(),
	AAUTOPILOT_USDC_TOKEN.address.toLowerCase(),
	AAUTOPILOT_WBTC_TOKEN.address.toLowerCase(),
	AAUTOPILOT_WETH_TOKEN.address.toLowerCase()
];

export const HARVEST_AUTOPILOT_URL = 'https://app.harvest.finance/';

// Every Autopilot vault the app ships with, unaffected by which networks the user enabled: the Earn
// card advertises the opportunity, so it must describe Harvest even while its networks are off. The
// address filter is inlined instead of reusing isTokenHarvestAutopilot to keep constants leaf-level.
export const HARVEST_AUTOPILOT_TOKENS: (RequiredErc4626Token | RequiredEvmErc4626Token)[] =
	ERC4626_TOKENS.filter(({ address }) =>
		HARVEST_AUTOPILOT_ADDRESSES.includes(address.toLowerCase())
	);

export const HARVEST_AUTOPILOT_NETWORK_ICONS: string[] = [
	...HARVEST_AUTOPILOT_TOKENS.reduce<Set<string>>(
		(acc, { network: { icon } }) => (nonNullish(icon) ? acc.add(icon) : acc),
		new Set()
	)
];

export const HARVEST_AUTOPILOT_ASSET_ICONS: string[] = [
	...HARVEST_AUTOPILOT_TOKENS.reduce<Set<string>>(
		(acc, { assetIcon }) => (nonNullish(assetIcon) ? acc.add(assetIcon) : acc),
		new Set()
	)
];
