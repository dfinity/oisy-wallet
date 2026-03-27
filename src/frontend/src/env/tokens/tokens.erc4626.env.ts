import { AUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-erc4626/tokens.autopilot_usdc.env';
import { EVM_ERC4626_TOKENS } from '$env/tokens/tokens-evm/tokens.erc4626.env';
import type { RequiredErc4626Token } from '$eth/types/erc4626';
import type { RequiredEvmErc4626Token } from '$evm/types/erc4626';

export const ERC4626_TOKENS: (RequiredErc4626Token | RequiredEvmErc4626Token)[] = [
	...EVM_ERC4626_TOKENS,
	AUTOPILOT_USDC_TOKEN
];
