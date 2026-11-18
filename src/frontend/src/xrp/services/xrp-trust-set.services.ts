import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import type { NullishIdentity } from '$lib/types/identity';
import { consoleError } from '$lib/utils/console.utils';
import {
	XRP_LAST_LEDGER_SEQUENCE_OFFSET,
	XRP_MAX_FEE_DROPS,
	XRP_MAX_UINT32
} from '$xrp/constants/xrp.constants';
import { XrpRpcNotConfiguredError } from '$xrp/providers/xrp-rpc.providers';
import {
	loadXrpAccountInfo,
	loadXrpAccountLines,
	loadXrpLedgerIndex,
	submitXrpTransaction
} from '$xrp/rest/xrpl.rest';
import { assertNoXrpPaymentInFlight } from '$xrp/services/xrp-in-flight.services';
import { openXrpPaymentRecord } from '$xrp/services/xrp-send.services';
import { getXrpSigningPublicKey, signXrpTransaction } from '$xrp/services/xrp-sign.services';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import { XRP_EXTERNAL_REF_KEYS } from '$xrp/types/xrp-active-tx';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import {
	XrpSendNotGuardedError,
	XrpTrustLineBalanceNotZeroError,
	XrpTrustLineNotHeldError,
	XrpTrustSetUnfundedError
} from '$xrp/types/xrp-send';
import type { XrpSendResult, XrpSubmitResult } from '$xrp/types/xrp-transaction';
import type { XrpTrustLineCustomToken, XrpTrustSetChange } from '$xrp/types/xrp-trust-line-token';
import { toXrpExternalRefs, toXrpTrustSetData } from '$xrp/utils/xrp-active-tx.utils';
import { getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';
import {
	buildXrpTrustSet,
	deriveXrpLedgerWindow,
	deriveXrpTransactionHash
} from '$xrp/utils/xrp-transaction.utils';
import { isXrpTokenValueZero, xrpTrustLineIdentifier } from '$xrp/utils/xrp-trust-line.utils';
import { isNullish } from '@dfinity/utils';

// The ledger waives the reserve of a new trust line while the account owns fewer objects than this
// (rippled `TrustSet.cpp`), so only from here on can a missing reserve fail the `TrustSet`.
const XRP_TRUST_LINE_RESERVE_WAIVER_OWNER_COUNT = 2;

/**
 * Adds a trust-line token to the account, or removes it: builds and threshold-signs a `TrustSet` for
 * it, records it, and submits it — through the same guard, record and resolution as an XRP send,
 * because a `TrustSet` takes the account's `Sequence` exactly as a payment does.
 *
 * `fee` is the figure the review showed, passed in rather than re-estimated, for the reason
 * `sendXrp` gives: re-fetching it would sign a fee the user never saw. It is still bounded here.
 *
 * Like `sendXrp`, it stops at the submit. The record opened just before the broadcast is what
 * establishes the outcome, and the poller drives it: an added token appears once the ledger holds
 * its line, and is saved to the backend list from there; a removed one leaves the list once the line
 * is gone.
 */
export const submitXrpTrustSet = async ({
	identity,
	network,
	source,
	token,
	change,
	fee,
	progress
}: {
	identity: NullishIdentity;
	network: XrpNetworkType;
	source: XrpAddress;
	token: XrpTrustLineCustomToken;
	change: XrpTrustSetChange;
	fee: XrpBalance;
	progress?: (step: ProgressStepsSendXrp) => void;
}): Promise<XrpSendResult> => {
	progress?.(ProgressStepsSendXrp.INITIALIZATION);

	// XRPL answers a `TrustSet` towards the account's own address `temDST_IS_SRC` and never applies
	// it; the backend refuses such a record too, so it is refused before anything is read.
	if (token.issuer === source) {
		throw new Error(`XRP trust line refused: ${source} is the token's own issuer.`);
	}

	if (fee <= ZERO || fee > XRP_MAX_FEE_DROPS) {
		throw new Error(`XRP fee must be between 1 and ${XRP_MAX_FEE_DROPS} drops, got ${fee}.`);
	}

	const data = toXrpTrustSetData({ token, source, change, fee });

	if (isNullish(data)) {
		throw new XrpSendNotGuardedError(
			`XRP trust line refused: ${token.network.name} has no backend token identity, so an unresolved transaction could not be recorded.`
		);
	}

	// Before the first node read, as for a send: while a transaction from this address is unresolved
	// no sequence is safe for this one.
	const recordIdentity = await assertNoXrpPaymentInFlight({ identity, source });

	// Both snapshots, each value taken the way that cannot hurt, as `sendXrp` reasons it out: the
	// higher sequence, the lower balance, the higher owner count.
	const [openAccount, validatedAccount, ledgerIndex, lines] = await Promise.all([
		loadXrpAccountInfo({ address: source, network, ledgerIndex: 'current' }),
		loadXrpAccountInfo({ address: source, network, ledgerIndex: 'validated' }),
		loadXrpLedgerIndex({ network }),
		// A removal's line is read again here: a payment that arrived since the review would leave a
		// balance the `TrustSet` cannot take back to the line's default state.
		change === 'remove'
			? loadXrpAccountLines({ address: source, network, peer: token.issuer })
			: undefined
	]);

	if (change === 'remove') {
		const identifier = xrpTrustLineIdentifier(token);
		const line = lines?.find((held) => xrpTrustLineIdentifier(held) === identifier);

		if (isNullish(line)) {
			throw new XrpTrustLineNotHeldError(`XRP account ${source} holds no ${identifier} line.`);
		}

		if (!isXrpTokenValueZero(line.balance)) {
			throw new XrpTrustLineBalanceNotZeroError(
				`XRP ${identifier} balance ${line.balance} is not zero.`
			);
		}
	}

	const sequence = Math.max(openAccount.sequence, validatedAccount.sequence);
	const balance =
		openAccount.balance < validatedAccount.balance ? openAccount.balance : validatedAccount.balance;
	const ownerCount = Math.max(openAccount.ownerCount, validatedAccount.ownerCount);

	// Checked again at signing: the review's reading can be stale, and either shortfall makes the
	// ledger apply the `TrustSet` as a failure that claims the fee. The reserve is compared against
	// the balance before the fee, as rippled compares it.
	if (balance < fee) {
		throw new XrpTrustSetUnfundedError(
			`XRP balance ${balance} drops cannot pay the ${fee} drops fee.`
		);
	}

	const reserveAfter = getXrpReserveDrops({ ownerCount: ownerCount + 1 });

	// Only adding raises the reserve; removing releases it.
	if (
		change === 'add' &&
		ownerCount >= XRP_TRUST_LINE_RESERVE_WAIVER_OWNER_COUNT &&
		balance < reserveAfter
	) {
		throw new XrpTrustSetUnfundedError(
			`XRP balance ${balance} drops cannot keep the ${reserveAfter} drops reserve of one more trust line.`
		);
	}

	if (ledgerIndex > XRP_MAX_UINT32 - XRP_LAST_LEDGER_SEQUENCE_OFFSET) {
		throw new Error(
			`XRP ledger index ${ledgerIndex} cannot form a UInt32 LastLedgerSequence with the ${XRP_LAST_LEDGER_SEQUENCE_OFFSET} ledger offset.`
		);
	}

	const signingPublicKey = await getXrpSigningPublicKey({ identity, network, account: source });

	const transaction = buildXrpTrustSet({
		account: source,
		token,
		change,
		fee,
		sequence,
		signingPublicKey,
		lastLedgerSequence: ledgerIndex + XRP_LAST_LEDGER_SEQUENCE_OFFSET
	});

	progress?.(ProgressStepsSendXrp.SIGN);
	const txBlob = await signXrpTransaction({ identity, network, transaction });

	const { lastLedgerSequence } = deriveXrpLedgerWindow(txBlob);
	const txHash = await deriveXrpTransactionHash(txBlob);

	progress?.(ProgressStepsSendXrp.SEND);

	// After signing and before submitting, for the reasons `sendXrp` gives: later would miss a submit
	// whose response is lost, earlier would describe a transaction that does not exist yet.
	await openXrpPaymentRecord({
		identity: recordIdentity,
		source,
		record: {
			data,
			progressStep: ProgressStepsSendXrp.SEND,
			externalRefs: toXrpExternalRefs({
				[XRP_EXTERNAL_REF_KEYS.TX_HASH]: txHash,
				[XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE]: `${lastLedgerSequence}`,
				// The row renders from these in a later session, when the token may not be listed.
				[XRP_EXTERNAL_REF_KEYS.TOKEN_SYMBOL]: token.symbol,
				[XRP_EXTERNAL_REF_KEYS.NETWORK_SYMBOL]: token.network.name
			})
		}
	});

	let submitResult: XrpSubmitResult | undefined;

	try {
		submitResult = await submitXrpTransaction({ txBlob, network });
	} catch (err: unknown) {
		// Only a missing endpoint provably precedes the request; anything else may follow a request
		// already processed, so the record decides, as for a send.
		if (err instanceof XrpRpcNotConfiguredError) {
			throw err;
		}

		consoleError(
			'XRP TrustSet submit did not return a usable response; the record decides the outcome.',
			err
		);
	}

	return { txHash, submitResult };
};
