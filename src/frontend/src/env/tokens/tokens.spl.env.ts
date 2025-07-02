import { SOL_MAINNET_ENABLED } from '$env/networks/networks.sol.env';
import { AAPLX_TOKEN } from '$env/tokens/tokens-spl/tokens.aaplx.env';
import { ABBVX_TOKEN } from '$env/tokens/tokens-spl/tokens.abbvx.env';
import { ABTX_TOKEN } from '$env/tokens/tokens-spl/tokens.abtx.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { COINX_TOKEN } from '$env/tokens/tokens-spl/tokens.coinx.env';
import { CRCLX_TOKEN } from '$env/tokens/tokens-spl/tokens.crclx.env';
import { DEVNET_EURC_TOKEN, EURC_TOKEN } from '$env/tokens/tokens-spl/tokens.eurc.env';
import { GOOGLX_TOKEN } from '$env/tokens/tokens-spl/tokens.googlx.env';
import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { METAX_TOKEN } from '$env/tokens/tokens-spl/tokens.metax.env';
import { MSTRX_TOKEN } from '$env/tokens/tokens-spl/tokens.mstrx.env';
import { ORCA_TOKEN } from '$env/tokens/tokens-spl/tokens.orca.env';
import { POPCAT_TOKEN } from '$env/tokens/tokens-spl/tokens.popcat.env';
import { RAY_TOKEN } from '$env/tokens/tokens-spl/tokens.ray.env';
import { SPYX_TOKEN } from '$env/tokens/tokens-spl/tokens.spyx.env';
import { TRUMP_TOKEN } from '$env/tokens/tokens-spl/tokens.trump.env';
import { DEVNET_USDC_TOKEN, USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-spl/tokens.usdt.env';
import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';
import type { RequiredSplToken } from '$sol/types/spl';

const SPL_TOKENS_MAINNET: RequiredSplToken[] = [
	AAPLX_TOKEN,
	ABBVX_TOKEN,
	ABTX_TOKEN,
	BONK_TOKEN,
	COINX_TOKEN,
	CRCLX_TOKEN,
	EURC_TOKEN,
	GOOGLX_TOKEN,
	JUP_TOKEN,
	METAX_TOKEN,
	MSTRX_TOKEN,
	ORCA_TOKEN,
	POPCAT_TOKEN,
	RAY_TOKEN,
	SPYX_TOKEN,
	TRUMP_TOKEN,
	USDC_TOKEN,
	USDT_TOKEN,
	WSOL_TOKEN
];

const SPL_TOKENS_DEVNET: RequiredSplToken[] = [DEVNET_USDC_TOKEN, DEVNET_EURC_TOKEN];

export const SPL_TOKENS: RequiredSplToken[] = defineSupportedTokens({
	mainnetFlag: SOL_MAINNET_ENABLED,
	mainnetTokens: SPL_TOKENS_MAINNET,
	testnetTokens: SPL_TOKENS_DEVNET
});
