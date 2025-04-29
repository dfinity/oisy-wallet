import { BSC_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.usdt.env';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';

const BSC_BEP20_TOKENS_MAINNET: RequiredEvmBep20Token[] = [USDC_TOKEN, USDT_TOKEN];

export const BSC_BEP20_TOKENS: RequiredEvmBep20Token[] = [
	...(BSC_MAINNET_ENABLED ? BSC_BEP20_TOKENS_MAINNET : [])
];
