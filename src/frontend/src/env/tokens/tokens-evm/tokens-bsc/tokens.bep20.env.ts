import { BSC_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { AMDON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.amdon.env';
import { ARMON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.armon.env';
import { BABAON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.babaon.env';
import { BIDUON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.biduon.env';
import { COPXON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.copxon.env';
import { EEMON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.eemon.env';
import { EFAON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.efaon.env';
import { IAUON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.iauon.env';
import { IVVON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.ivvon.env';
import { MUON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.muon.env';
import { NVDAON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.nvdaon.env';
import { PBRON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.pbron.env';
import { SLVON_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.slvon.env';
import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.usdt.env';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';

const BSC_BEP20_TOKENS_MAINNET: RequiredEvmBep20Token[] = [
	AMDON_TOKEN,
	ARMON_TOKEN,
	BABAON_TOKEN,
	BIDUON_TOKEN,
	COPXON_TOKEN,
	EEMON_TOKEN,
	EFAON_TOKEN,
	IAUON_TOKEN,
	IVVON_TOKEN,
	MUON_TOKEN,
	NVDAON_TOKEN,
	PBRON_TOKEN,
	SLVON_TOKEN,
	USDC_TOKEN,
	USDT_TOKEN
];

export const BSC_BEP20_TOKENS: RequiredEvmBep20Token[] = defineSupportedTokens({
	mainnetFlag: BSC_MAINNET_ENABLED,
	mainnetTokens: BSC_BEP20_TOKENS_MAINNET
});
