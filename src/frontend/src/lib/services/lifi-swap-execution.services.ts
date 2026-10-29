import type { ActiveUserTransactionData } from '$declarations/backend/backend.did';
import {
	LIFI_ROW_DELETE_ATTEMPTS,
	LIFI_ROW_DELETE_RETRY_DELAY_MILLIS
} from '$lib/constants/swap.constants';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import {
	createActiveUserTransaction,
	deleteActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { LifiRouteUnsupportedError } from '$lib/types/errors';
import type { LifiExternalRefKey } from '$lib/types/lifi';
import type { NetworkId } from '$lib/types/network';
import { consoleError } from '$lib/utils/console.utils';
import { toLifiExternalRefs } from '$lib/utils/lifi-active-tx.utils';
import { isLifiRouteExecutable } from '$lib/utils/lifi-calldata.utils';
import { assertLifiQuote } from '$lib/utils/lifi-swap.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import type { Identity } from '@icp-sdk/core/agent';
import { HTTPError, SDKError, type LiFiStep, type QuoteRequestFromAmount } from '@lifi/sdk';

// 404 is "no available quotes", 422 "none of the available routes could generate a transaction".
const isNoRouteError = (err: unknown): boolean =>
	err instanceof SDKError &&
	err.cause instanceof HTTPError &&
	(err.cause.status === 404 || err.cause.status === 422);

// The prefix the wizard recognises a slippage error by.
const SLIPPAGE_EXCEEDED = 'Slippage exceeded.';

export const isSlippageExceeded = (err: unknown): boolean =>
	err instanceof Error && err.message.startsWith(SLIPPAGE_EXCEEDED);

/**
 * Re-quotes `request` and refuses a quote that fails the trust checks, or whose route the calldata
 * binding would refuse; a Solana route has no bridge, whose shape this judges. When no route comes
 * back, or its minimum is below the one displayed, the swap aborts as a slippage error.
 */
export const requoteAtLeast = async ({
	request,
	sourceNetworkId,
	displayedToAmountMin
}: {
	request: QuoteRequestFromAmount;
	sourceNetworkId: NetworkId;
	displayedToAmountMin: bigint;
}): Promise<LiFiStep> => {
	let quote: LiFiStep;

	try {
		// A copy, because the SDK fills its defaults into the object it is given.
		quote = await fetchLifiQuote({ ...request });
	} catch (err: unknown) {
		if (isNoRouteError(err)) {
			throw new Error(`${SLIPPAGE_EXCEEDED} LI.FI no longer has a route for the swap.`, {
				cause: err
			});
		}

		throw err;
	}

	assertLifiQuote({ quote, request, sourceNetworkId });

	// The pinned bridge does not pin the route's shape: a refreshed Across route can put a DEX swap
	// before the bridge. Refused here, it costs no approval.
	if (!isLifiRouteExecutable(quote)) {
		throw new LifiRouteUnsupportedError(
			`LI.FI's refreshed route via ${quote.tool} cannot be executed`
		);
	}

	const toAmountMin = BigInt(quote.estimate.toAmountMin);

	if (toAmountMin < displayedToAmountMin) {
		throw new Error(
			`${SLIPPAGE_EXCEEDED} LI.FI now guarantees ${toAmountMin}, below the ${displayedToAmountMin} displayed.`
		);
	}

	return quote;
};

/**
 * Deletes a LI.FI row whose transaction was never broadcast. A delete that keeps failing leaves the
 * row to the poller, which settles it once the transaction can no longer land: on EVM once its nonce
 * is used, on Solana once its blockhash has expired.
 */
export const deleteLifiRow = async ({ identity, id }: { identity: Identity; id: string }) => {
	for (let attempt = 1; attempt <= LIFI_ROW_DELETE_ATTEMPTS; attempt++) {
		try {
			await deleteActiveUserTransaction({ identity, id });

			return;
		} catch (err: unknown) {
			consoleError(err);
		}

		if (attempt < LIFI_ROW_DELETE_ATTEMPTS) {
			await waitForMilliseconds(LIFI_ROW_DELETE_RETRY_DELAY_MILLIS);
		}
	}
};

/**
 * Creates the row of a LI.FI swap whose source transaction is signed and not yet broadcast, and
 * returns its id. A creation that fails rejects, so that nothing is broadcast untracked; its row is
 * deleted all the same, since the backend may have committed it if only its answer was lost.
 */
export const createLifiRow = async ({
	identity,
	data,
	refs
}: {
	identity: Identity;
	data: ActiveUserTransactionData;
	refs: Partial<Record<LifiExternalRefKey, string>>;
}): Promise<string> => {
	const id = crypto.randomUUID();

	try {
		await createActiveUserTransaction({
			identity,
			id,
			data,
			externalRefs: toLifiExternalRefs(refs)
		});
	} catch (err: unknown) {
		await deleteLifiRow({ identity, id });

		throw err;
	}

	return id;
};
