import { SOL_MAINNET_ENABLED } from '$env/networks/networks.sol.env';
import { AAPLX_TOKEN } from '$env/tokens/tokens-spl/tokens.aaplx.env';
import { ABBVX_TOKEN } from '$env/tokens/tokens-spl/tokens.abbvx.env';
import { ABTX_TOKEN } from '$env/tokens/tokens-spl/tokens.abtx.env';
import { ACNX_TOKEN } from '$env/tokens/tokens-spl/tokens.acnx.env';
import { AMBRX_TOKEN } from '$env/tokens/tokens-spl/tokens.ambrx.env';
import { AMZNX_TOKEN } from '$env/tokens/tokens-spl/tokens.amznx.env';
import { AVGOX_TOKEN } from '$env/tokens/tokens-spl/tokens.avgox.env';
import { AZNX_TOKEN } from '$env/tokens/tokens-spl/tokens.aznx.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { CMCSAX_TOKEN } from '$env/tokens/tokens-spl/tokens.cmcsax.env';
import { COINX_TOKEN } from '$env/tokens/tokens-spl/tokens.coinx.env';
import { CRCLX_TOKEN } from '$env/tokens/tokens-spl/tokens.crclx.env';
import { CRWDX_TOKEN } from '$env/tokens/tokens-spl/tokens.crwdx.env';
import { CSCOX_TOKEN } from '$env/tokens/tokens-spl/tokens.cscox.env';
import { DFDVX_TOKEN } from '$env/tokens/tokens-spl/tokens.dfdvx.env';
import { DHRX_TOKEN } from '$env/tokens/tokens-spl/tokens.dhrx.env';
import { DEVNET_EURC_TOKEN, EURC_TOKEN } from '$env/tokens/tokens-spl/tokens.eurc.env';
import { GLDX_TOKEN } from '$env/tokens/tokens-spl/tokens.gldx.env';
import { GMEX_TOKEN } from '$env/tokens/tokens-spl/tokens.gmex.env';
import { GOOGLX_TOKEN } from '$env/tokens/tokens-spl/tokens.googlx.env';
import { HDX_TOKEN } from '$env/tokens/tokens-spl/tokens.hdx.env';
import { HONX_TOKEN } from '$env/tokens/tokens-spl/tokens.honx.env';
import { HOODX_TOKEN } from '$env/tokens/tokens-spl/tokens.hoodx.env';
import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { KOX_TOKEN } from '$env/tokens/tokens-spl/tokens.kox.env';
import { LLYX_TOKEN } from '$env/tokens/tokens-spl/tokens.llyx.env';
import { MAX_TOKEN } from '$env/tokens/tokens-spl/tokens.max.env';
import { MCDX_TOKEN } from '$env/tokens/tokens-spl/tokens.mcdx.env';
import { METAX_TOKEN } from '$env/tokens/tokens-spl/tokens.metax.env';
import { MSTRX_TOKEN } from '$env/tokens/tokens-spl/tokens.mstrx.env';
import { NFLXX_TOKEN } from '$env/tokens/tokens-spl/tokens.nflxx.env';
import { NVDAX_TOKEN } from '$env/tokens/tokens-spl/tokens.nvdax.env';
import { ORCA_TOKEN } from '$env/tokens/tokens-spl/tokens.orca.env';
import { PENGU_TOKEN } from '$env/tokens/tokens-spl/tokens.pengu.env';
import { PEPX_TOKEN } from '$env/tokens/tokens-spl/tokens.pepx.env';
import { PGX_TOKEN } from '$env/tokens/tokens-spl/tokens.pgx.env';
import { POPCAT_TOKEN } from '$env/tokens/tokens-spl/tokens.popcat.env';
import { QQQX_TOKEN } from '$env/tokens/tokens-spl/tokens.qqqx.env';
import { RAY_TOKEN } from '$env/tokens/tokens-spl/tokens.ray.env';
import { SPX_TOKEN } from '$env/tokens/tokens-spl/tokens.spx.env';
import { SPYX_TOKEN } from '$env/tokens/tokens-spl/tokens.spyx.env';
import { TQQQX_TOKEN } from '$env/tokens/tokens-spl/tokens.tqqqx.env';
import { TRUMP_TOKEN } from '$env/tokens/tokens-spl/tokens.trump.env';
import { TSLAX_TOKEN } from '$env/tokens/tokens-spl/tokens.tslax.env';
import { UNHX_TOKEN } from '$env/tokens/tokens-spl/tokens.unhx.env';
import { DEVNET_USDC_TOKEN, USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-spl/tokens.usdt.env';
import { VTIX_TOKEN } from '$env/tokens/tokens-spl/tokens.vtix.env';
import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';
import type { RequiredSplToken } from '$sol/types/spl';

const SPL_TOKENS_MAINNET: RequiredSplToken[] = [
	AAPLX_TOKEN,
	ABBVX_TOKEN,
	ABTX_TOKEN,
	ACNX_TOKEN,
	AMBRX_TOKEN,
	AMZNX_TOKEN,
	AVGOX_TOKEN,
	AZNX_TOKEN,
	BONK_TOKEN,
	CMCSAX_TOKEN,
	COINX_TOKEN,
	CRCLX_TOKEN,
	CRWDX_TOKEN,
	CSCOX_TOKEN,
	DFDVX_TOKEN,
	DHRX_TOKEN,
	EURC_TOKEN,
	GLDX_TOKEN,
	GMEX_TOKEN,
	GOOGLX_TOKEN,
	HDX_TOKEN,
	HONX_TOKEN,
	HOODX_TOKEN,
	JUP_TOKEN,
	KOX_TOKEN,
	LLYX_TOKEN,
	MAX_TOKEN,
	MCDX_TOKEN,
	METAX_TOKEN,
	MSTRX_TOKEN,
	NFLXX_TOKEN,
	NVDAX_TOKEN,
	ORCA_TOKEN,
	PENGU_TOKEN,
	PEPX_TOKEN,
	PGX_TOKEN,
	POPCAT_TOKEN,
	QQQX_TOKEN,
	RAY_TOKEN,
	SPX_TOKEN,
	SPYX_TOKEN,
	TQQQX_TOKEN,
	TRUMP_TOKEN,
	TSLAX_TOKEN,
	UNHX_TOKEN,
	USDC_TOKEN,
	USDT_TOKEN,
	VTIX_TOKEN,
	WSOL_TOKEN
];

const SPL_TOKENS_DEVNET: RequiredSplToken[] = [DEVNET_USDC_TOKEN, DEVNET_EURC_TOKEN];

export const SPL_TOKENS: RequiredSplToken[] = defineSupportedTokens({
	mainnetFlag: SOL_MAINNET_ENABLED,
	mainnetTokens: SPL_TOKENS_MAINNET,
	testnetTokens: SPL_TOKENS_DEVNET
});
