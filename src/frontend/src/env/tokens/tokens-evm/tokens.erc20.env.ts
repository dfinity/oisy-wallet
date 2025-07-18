import { ARBITRUM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.erc20.env';
import { BASE_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens-base/tokens.erc20.env';
import { BSC_BEP20_TOKENS } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bep20.env';
import { POLYGON_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens-polygon/tokens.erc20.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';

export const EVM_ERC20_TOKENS: RequiredEvmErc20Token[] = [
	...BASE_ERC20_TOKENS,
	...BSC_BEP20_TOKENS,
	...POLYGON_ERC20_TOKENS,
	...ARBITRUM_ERC20_TOKENS
];
