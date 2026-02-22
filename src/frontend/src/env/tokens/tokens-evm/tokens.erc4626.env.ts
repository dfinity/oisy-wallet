import { ARBITRUM_ERC4626_TOKENS } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.erc4626.env';
import { BASE_ERC4626_TOKENS } from '$env/tokens/tokens-evm/tokens-base/tokens.erc4626.env';
import type { RequiredEvmErc4626Token } from '$evm/types/erc4626';

export const EVM_ERC4626_TOKENS: RequiredEvmErc4626Token[] = [
	...BASE_ERC4626_TOKENS,
	...ARBITRUM_ERC4626_TOKENS
];
