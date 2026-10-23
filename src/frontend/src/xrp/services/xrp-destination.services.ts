import { XRP_ACCOUNT_FLAG_REQUIRE_DEST_TAG } from '$xrp/constants/xrp.constants';
import { XrpAccountNotFoundError, loadXrpAccountInfo } from '$xrp/rest/xrpl.rest';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import type { XrpDestinationFacts } from '$xrp/types/xrp-send';

// `flags` is a number on the `exists` branch, not an optional one: `Flags` is a mandatory
// AccountRoot field, so a response without it fails the parse and lands on `error` — an
// unanswerable lookup — rather than arriving here as a snapshot with nothing to say.
type XrpDestinationRead = { exists: true; flags: number } | { exists: false } | { error: Error };

const readDestination = async ({
	destination,
	network,
	ledgerIndex
}: {
	destination: XrpAddress;
	network: XrpNetworkType;
	ledgerIndex: 'current' | 'validated';
}): Promise<XrpDestinationRead> => {
	try {
		const { flags } = await loadXrpAccountInfo({ address: destination, network, ledgerIndex });

		return { exists: true, flags };
	} catch (err: unknown) {
		if (err instanceof XrpAccountNotFoundError) {
			return { exists: false };
		}

		return { error: err instanceof Error ? err : new Error(String(err)) };
	}
};

/**
 * Reads a payment's destination from both ledger snapshots and reduces them to the facts the
 * pre-sign guards in `sendXrp` decide on. The send form reads the same facts to show those
 * refusals before Next, so the two cannot disagree about what the ledger said.
 *
 * Never rejects: an unanswerable read comes back as `unavailable`, because whether it matters
 * depends on the amount and the tag, and only the caller knows those.
 *
 * The node's error is the only thing that means unfunded. A zero balance does not: the transaction
 * cost can take an existing account below its reserve, even to nothing, and the account still
 * exists — at which point it can receive any amount, since receiving carries no reserve requirement
 * of its own.
 *
 * Three states, not a boolean: "it is not there" and "I could not ask" lead to different
 * decisions, and an unavailable lookup keeps its error rather than discarding it. The flags come
 * back with it — they are in the same response, so reading them costs nothing.
 *
 * Both snapshots, because a creation, a deletion or an `lsfRequireDestTag` change that lives only
 * in the open ledger may never validate, and trusting it lets a below-reserve or untagged payment
 * through to a fee-claiming `tec*` — which is the outcome the send declines payments before signing
 * to avoid.
 *
 * The pessimistic reading in both directions. `settled` requires the account in BOTH, so a creation
 * that has not validated and a deletion that has not validated are equally unsettled without
 * needing a rule each. `requiresTag` fires if EITHER snapshot has the bit, because a tag that turns
 * out not to have been needed costs nothing — XRPL simply carries it — while a missing one claims
 * the fee.
 *
 * A false decline here is cheap and actionable: it says the amount must reach the account reserve,
 * before anything is signed. That is the trade the send makes everywhere else.
 */
export const loadXrpDestination = async ({
	destination,
	network
}: {
	destination: XrpAddress;
	network: XrpNetworkType;
}): Promise<XrpDestinationFacts> => {
	const reads = await Promise.all([
		readDestination({ destination, network, ledgerIndex: 'current' }),
		readDestination({ destination, network, ledgerIndex: 'validated' })
	]);

	return {
		settled: reads.every((read) => 'exists' in read && read.exists),
		requiresTag: reads.some(
			(read) => 'flags' in read && (read.flags & XRP_ACCOUNT_FLAG_REQUIRE_DEST_TAG) !== 0
		),
		unavailable: reads.find((read): read is { error: Error } => 'error' in read)?.error
	};
};
