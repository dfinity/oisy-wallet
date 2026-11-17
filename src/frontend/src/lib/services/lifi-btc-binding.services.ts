import { LifiRouteUnsupportedError } from '$lib/types/errors';
import type { LifiBtcOutput } from '$lib/types/lifi';
import { isNullish } from '@dfinity/utils';
import type { LiFiStep, QuoteRequestFromAmount } from '@lifi/sdk';

export interface LifiBtcPayoutBindingParams {
	// The re-quoted step whose transaction is signed.
	quote: LiFiStep;
	// Its output 0, the deposit that is signed: the bridge's record must be found by it, or return it,
	// and its input must equal its value. Otherwise a substituted quote could keep a genuine record
	// while paying the deposit elsewhere.
	deposit: LifiBtcOutput;
	// Its `OP_RETURN` memo: a bridge that pays a shared deposit address (LayerSwap, Relay) tells the
	// swaps apart by the id it carries.
	memo: LifiBtcOutput;
	// What the user reviewed: the destination chain, asset and recipient (`toAddress`).
	request: QuoteRequestFromAmount;
	// The minimum the review showed, which the record's minimum must reach.
	displayedToAmountMin: bigint;
}

/**
 * Reads a bridge's own record of a BTC deposit before it is signed, and rejects when the record does
 * not pay what the user reviewed: its destination chain and asset, its recipient, and at least the
 * displayed minimum. A BTC transaction cannot say who is paid on the destination chain, so this is
 * the only check of it; it trusts the bridge's answer instead of on-chain calldata.
 */
export type LifiBtcPayoutBinding = (params: LifiBtcPayoutBindingParams) => Promise<void>;

/**
 * The payout binding of each bridge admitted from Bitcoin, by LI.FI tool key. A bridge joins
 * `LIFI_ALLOWED_BRIDGES[BTC_MAINNET_NETWORK_ID]` only together with its entry here. None has one yet:
 * LayerSwap keeps LI.FI's swaps out of its keyless API, and Relay creates its record (by the memo's
 * order id) only once it sees the deposit.
 */
const LIFI_BTC_PAYOUT_BINDINGS: Partial<Record<string, LifiBtcPayoutBinding>> = {};

// The table's own entries only: a route's tool key comes from LI.FI's response.
const payoutBindingOf = ({
	tool,
	bindings
}: {
	tool: string;
	bindings: Partial<Record<string, LifiBtcPayoutBinding>>;
}): LifiBtcPayoutBinding | undefined =>
	Object.hasOwn(bindings, tool) ? bindings[tool] : undefined;

/**
 * Whether a route from Bitcoin through `tool` can be bound, so the form never offers one execution
 * would refuse.
 */
export const hasLifiBtcPayoutBinding = ({
	tool,
	bindings = LIFI_BTC_PAYOUT_BINDINGS
}: {
	tool: string;
	bindings?: Partial<Record<string, LifiBtcPayoutBinding>>;
}): boolean => payoutBindingOf({ tool, bindings }) !== undefined;

/**
 * Runs the payout binding of the quote's bridge, or rejects when its bridge has none. `bindings` is
 * the registry, replaced in tests only.
 */
export const bindLifiBtcPayout = async ({
	bindings = LIFI_BTC_PAYOUT_BINDINGS,
	...params
}: LifiBtcPayoutBindingParams & {
	bindings?: Partial<Record<string, LifiBtcPayoutBinding>>;
}): Promise<void> => {
	const { quote } = params;
	const binding = payoutBindingOf({ tool: quote.tool, bindings });

	if (isNullish(binding)) {
		throw new LifiRouteUnsupportedError(
			`LI.FI's route from Bitcoin via ${quote.tool} has no payout binding`,
			{ route: quote }
		);
	}

	await binding(params);
};
