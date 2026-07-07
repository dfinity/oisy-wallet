import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import {
	IC_CKUSDC_LEDGER_CANISTER_ID,
	IC_CKUSDT_LEDGER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.erc20.env';
import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { OptionCanisterIdText } from '$lib/types/canister';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import type { Token } from '$lib/types/token';

// Provider id for the earning-provider registry.
export const LIQUIDIUM_PROVIDER_ID = 'liquidium';

// Market asset symbol → oisy token (for logo/label); unmapped future assets fall
// back to symbol-only.
export const LIQUIDIUM_ASSET_TOKENS: Record<string, Token> = {
	BTC: BTC_MAINNET_TOKEN,
	ETH: ETHEREUM_TOKEN,
	USDC: USDC_TOKEN,
	USDT: USDT_TOKEN
};

// Hard-coded ICP teaser appended to the Markets box until Liquidium lists ICP.
// Advertises the asset with disabled actions; carries its own token for the logo so
// it stays out of the shared asset/network icon sets. TODO: remove once ICP is live.
export const LIQUIDIUM_ICP_TEASER_MARKET: LiquidiumMarket = {
	poolId: 'icp-teaser',
	asset: ICP_TOKEN.symbol,
	// SDK-chain-style id (cf. 'BTC'/'ETH'); inert here since the teaser never opens a modal.
	chain: 'ICP',
	supplyApy: 0,
	borrowApy: 0,
	frozen: false,
	available: true,
	teaser: true
};

// ck-ledger backing each asset, for the AUT's backend `TokenId`.
export const LIQUIDIUM_ASSET_LEDGER_CANISTER_IDS: Record<string, OptionCanisterIdText> = {
	BTC: IC_CKBTC_LEDGER_CANISTER_ID,
	ETH: IC_CKETH_LEDGER_CANISTER_ID,
	USDC: IC_CKUSDC_LEDGER_CANISTER_ID,
	USDT: IC_CKUSDT_LEDGER_CANISTER_ID
};

// Display bands — Liquidium publishes no discrete cut-offs, so oisy picks its own
// (spec → Open question #7).
export const LIQUIDIUM_HEALTH_AT_RISK_PERCENT = 50;
export const LIQUIDIUM_HEALTH_CRITICAL_PERCENT = 15;

export type LiquidiumHealthLevel = 'healthy' | 'at-risk' | 'critical';

// Relative tolerance on the borrowing-power cap so a "Max" amount (rounded to the
// token's decimals) doesn't trip its own limit.
export const LIQUIDIUM_BORROWING_POWER_TOLERANCE = 1e-6;

// Withdraw free-collateral cap tolerance, so a "Max" amount doesn't flag itself.
export const LIQUIDIUM_WITHDRAW_CAP_TOLERANCE = 1e-6;

// Refresh cadence for markets + positions while the provider page is visible.
export const LIQUIDIUM_POLL_INTERVAL_MILLIS = 30_000;
