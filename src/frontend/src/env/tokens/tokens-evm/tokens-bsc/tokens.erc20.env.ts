import { BSC_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-erc20/tokens.usdt.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';

const BSC_ERC20_TOKENS_MAINNET: RequiredEvmErc20Token[] = [USDC_TOKEN, USDT_TOKEN];

export const BSC_ERC20_TOKENS: RequiredEvmErc20Token[] = [
	...(BSC_MAINNET_ENABLED ? BSC_ERC20_TOKENS_MAINNET : [])
];
