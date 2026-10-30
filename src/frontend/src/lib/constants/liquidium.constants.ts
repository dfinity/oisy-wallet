import { ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
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
import { ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import type { OptionCanisterIdText } from '$lib/types/canister';
import type { Token } from '$lib/types/token';

// Provider id for the earning-provider registry.
export const LIQUIDIUM_PROVIDER_ID = 'liquidium';

// Advertised v1 asset set, for the Earn-card Networks/Assets icon rows only (a static
// marketing summary, distinct from the live per-market display token which is resolved
// by (chain, asset) via `liquidiumMarketToken`).
export const LIQUIDIUM_ADVERTISED_TOKENS: Token[] = [
	BTC_MAINNET_TOKEN,
	ETHEREUM_TOKEN,
	USDC_TOKEN,
	USDT_TOKEN,
	ICP_TOKEN
];

// Display order for the Markets list and the withdraw/repay pickers, applied as a stable sort on
// top of the order Liquidium returns (see `orderLiquidiumRails`). Primary key: the lending pool,
// by asset symbol. Assets not listed keep their received order, after the listed ones.
export const LIQUIDIUM_POOL_ORDER: string[] = ['BTC', 'ETH', 'ICP', 'USDC', 'USDT'];

// Transfer-network order, the final tiebreaker after "native rail first" — so extra networks
// slot in predictably if the protocol adds them.
export const LIQUIDIUM_NETWORK_ORDER: string[] = ['BTC', 'ETH', 'ICP'];

// ck-ledger backing each asset, for the AUT's backend `TokenId`. Keyed by symbol: the
// ck twin is the same regardless of transfer chain (native BTC and ckBTC both settle on
// the ckBTC ledger); ICP maps to its own ledger.
export const LIQUIDIUM_ASSET_LEDGER_CANISTER_IDS: Record<string, OptionCanisterIdText> = {
	BTC: IC_CKBTC_LEDGER_CANISTER_ID,
	ETH: IC_CKETH_LEDGER_CANISTER_ID,
	USDC: IC_CKUSDC_LEDGER_CANISTER_ID,
	USDT: IC_CKUSDT_LEDGER_CANISTER_ID,
	ICP: ICP_LEDGER_CANISTER_ID
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

// Headroom on the "Max (full debt)" repay for interest accruing between quote and settlement, in
// bps of the debt. Same value as the SDK's own `getMaxRepayAmount` default.
export const LIQUIDIUM_REPAY_BUFFER_BPS = 10n;
export const LIQUIDIUM_BPS_SCALE = 10_000n;

// Refresh cadence for markets + positions while the provider page is visible.
export const LIQUIDIUM_POLL_INTERVAL_MILLIS = 30_000;

// How long a repay's AUT may go without its txid and without a write before the poller deletes it,
// counted in the poller's own ticks (see `OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS` for why not in
// wall time). The repay records its row before the broadcast, renews it while the broadcast is
// pending (`LIQUIDIUM_REPAY_LEASE_RENEWAL_MILLIS`) and adds the txid right after it, so a row left
// alone this long has nobody left to add one: its tab closed, or the write failed.
//
// Ten minutes: many renewals long, so a few lost ones do not end a broadcast's claim. Not much
// longer, since until then a repay that was never sent keeps lowering the repay max.
export const LIQUIDIUM_REPAY_TXID_GRACE_PERIOD_MILLIS = 10 * 60 * 1000;

export const LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS = Math.ceil(
	LIQUIDIUM_REPAY_TXID_GRACE_PERIOD_MILLIS / ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS
);

// How often a repay renews its row while its broadcast is pending, so the poller does not take it
// for abandoned: nothing bounds how long a broadcast can take. Well inside the grace period above.
export const LIQUIDIUM_REPAY_LEASE_RENEWAL_MILLIS = 60_000;
