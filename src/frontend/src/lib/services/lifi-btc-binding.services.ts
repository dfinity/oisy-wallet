import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { LIFI_ALLOWED_BRIDGES, LIFI_DENY_BRIDGES } from '$env/rest/lifi.env';
import { bindLifiRelayPayout } from '$lib/services/lifi-btc-relay-binding.services';
import { LifiRouteUnsupportedError } from '$lib/types/errors';
import type { LifiBtcOutput } from '$lib/types/lifi';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { isNullish } from '@dfinity/utils';
import { ChainId, type LiFiStep, type QuoteRequestFromAmount } from '@lifi/sdk';

// LI.FI's tool key for Relay (`/v1/tools`).
const LIFI_RELAY_TOOL = 'relaydepository';

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
 * `LIFI_ALLOWED_BRIDGES[BTC_MAINNET_NETWORK_ID]` only together with its entry here.
 *
 * Relay's is best effort (`bindLifiRelayPayout`). LayerSwap has none: it keeps LI.FI's swaps out of
 * its keyless API. NEAR's would be 1Click's signed record, but from BTC it only duplicates OISY's own
 * NEAR Intents provider at a higher cost.
 */
const LIFI_BTC_PAYOUT_BINDINGS: Partial<Record<string, LifiBtcPayoutBinding>> = {
	[LIFI_RELAY_TOOL]: bindLifiRelayPayout
};

/**
 * Whether the offer is a LI.FI route from Bitcoin through Relay, whose binding cannot check the
 * recipient (`bindLifiRelayPayout`): the form and the review warn that OISY cannot confirm who is
 * paid. Keyed on the tool, not on its display name, which is LI.FI's to choose.
 */
export const isLifiBtcRelayOffer = (offer: SwapMappedResult | undefined): boolean =>
	offer?.provider === SwapProvider.LIFI &&
	offer.request.fromChain === ChainId.BTC &&
	offer.swapDetails.tool === LIFI_RELAY_TOOL;

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
 * The bridges a quote from BTC may go through: allowed from Bitcoin, not denied, and with a payout
 * binding. While it is empty, LI.FI from BTC is not offered at all. `bindings` is the registry,
 * replaced in tests only.
 */
export const lifiBtcAdmittedBridges = ({
	bindings = LIFI_BTC_PAYOUT_BINDINGS
}: {
	bindings?: Partial<Record<string, LifiBtcPayoutBinding>>;
} = {}): string[] =>
	(LIFI_ALLOWED_BRIDGES[BTC_MAINNET_NETWORK_ID] ?? []).filter(
		(tool) => !LIFI_DENY_BRIDGES.includes(tool) && hasLifiBtcPayoutBinding({ tool, bindings })
	);

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
