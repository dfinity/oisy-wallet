import { CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { OWN_CYCLES_ENABLED } from '$env/own-cycles.env';
import { getTransactions } from '$icp/api/icrc-index-ng.api';
import { allowance, approve, balance } from '$icp/api/icrc-ledger.api';
import type { IndexCanisterIdText } from '$icp/types/canister';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { BACKEND_CANISTER_PRINCIPAL, SIGNER_CANISTER_ID, ZERO } from '$lib/constants/app.constants';
import type { NullishIdentity } from '$lib/types/identity';
import { assertNonNullish, fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import type { IcrcAccount, IcrcIndexDid } from '@icp-sdk/canisters/ledger/icrc';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

export interface OwnCycles {
	// What the signer may still charge to the user's TCYCLES: the approval left.
	approved: bigint;
	// The user's TCYCLES balance, which every charge comes from.
	balance: bigint;
}

// A call paid with the caller's own cycles (`CallerPaysIcrc2Cycles`) is charged from the caller's
// main cycles-ledger account, through an approval to the signer's main account.
const signerAccount = (): IcrcAccount => ({ owner: Principal.fromText(SIGNER_CANISTER_ID) });

const loadApproved = async ({
	identity,
	certified = false
}: {
	identity: Identity;
	certified?: boolean;
}): Promise<bigint> => {
	const { allowance: approved } = await allowance({
		identity,
		certified,
		ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
		owner: { owner: identity.getPrincipal() },
		spender: signerAccount()
	});

	return approved;
};

/**
 * The approval left for the signer and the TCYCLES balance, read with queries unless `certified`:
 * they are only shown, and an approval built on them states the amount it replaces (see
 * `setSpendingLimit`). They come from the cycles ledger itself, so they are there whether or not
 * the user has TCYCLES enabled.
 */
export const loadOwnCycles = async ({
	identity,
	certified = false
}: {
	identity: NullishIdentity;
	certified?: boolean;
}): Promise<OwnCycles> => {
	assertNonNullish(identity);

	const [approved, ownBalance] = await Promise.all([
		loadApproved({ identity, certified }),
		balance({
			identity,
			certified,
			ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
			owner: identity.getPrincipal()
		})
	]);

	return { approved, balance: ownBalance };
};

/**
 * What is left of the free OISY allowance, read with a query unless `certified`, as it is only
 * shown. The backend's main account approves the signer, with the user's ICP account identifier as
 * the spender's subaccount (`principal2account` in the backend). A granted allowance request can
 * still raise it.
 */
export const loadFreeAllowance = async ({
	identity,
	certified = false
}: {
	identity: NullishIdentity;
	certified?: boolean;
}): Promise<bigint> => {
	assertNonNullish(identity);

	const { allowance: free } = await allowance({
		identity,
		certified,
		ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
		owner: { owner: BACKEND_CANISTER_PRINCIPAL },
		spender: {
			owner: Principal.fromText(SIGNER_CANISTER_ID),
			subaccount: getAccountIdentifier(identity.getPrincipal()).toUint8Array()
		}
	});

	return free;
};

// How far back the read looks for the last approval: charges paid with own cycles land in the
// same history, between approvals.
const PREVIOUS_LIMIT_PAGES = 5;
const PREVIOUS_LIMIT_PAGE_SIZE = 100n;

const isDefaultSubaccount = (subaccount: [] | [Uint8Array]): boolean =>
	(fromNullable(subaccount) ?? new Uint8Array()).every((byte) => byte === 0);

const isOwnApproval = ({
	approve: { from, spender },
	owner
}: {
	approve: IcrcIndexDid.Approve;
	owner: Principal;
}): boolean =>
	from.owner.toText() === owner.toText() &&
	isDefaultSubaccount(from.subaccount) &&
	spender.owner.toText() === SIGNER_CANISTER_ID &&
	isDefaultSubaccount(spender.subaccount);

/**
 * The spending limit the user set last: their last approval to the signer, found in the cycles
 * ledger's index, or `undefined` when none turns up in the history it looks through. The ledger
 * keeps only what is left of an approval, and the index follows it a few seconds behind.
 */
export const loadPreviousSpendingLimit = async ({
	identity,
	indexCanisterId,
	certified = false
}: {
	identity: NullishIdentity;
	indexCanisterId: IndexCanisterIdText;
	certified?: boolean;
}): Promise<bigint | undefined> => {
	assertNonNullish(identity);

	const owner = identity.getPrincipal();
	let start: bigint | undefined;

	for (let page = 0; page < PREVIOUS_LIMIT_PAGES; page++) {
		const { transactions, oldest_tx_id } = await getTransactions({
			identity,
			owner,
			indexCanisterId,
			start,
			maxResults: PREVIOUS_LIMIT_PAGE_SIZE,
			certified
		});

		// Newest first.
		for (const { transaction } of transactions) {
			const approval = fromNullable(transaction.approve);

			if (nonNullish(approval) && isOwnApproval({ approve: approval, owner })) {
				return approval.amount;
			}
		}

		const oldest = transactions.at(-1)?.id;

		if (isNullish(oldest) || oldest === fromNullable(oldest_tx_id)) {
			return undefined;
		}

		start = oldest;
	}

	return undefined;
};

/**
 * Whether the user's own cycles can pay a charged call: paying with them is on, and some approval
 * is left for the signer. No call's price is known, so any approval left counts. A query is
 * enough: the ledger enforces the approval when the signer charges it.
 *
 * It never throws: an approval that can't be read counts as none.
 */
export const canPayWithOwnCycles = async ({
	identity
}: {
	identity: NullishIdentity;
}): Promise<boolean> => {
	if (!OWN_CYCLES_ENABLED || isNullish(identity)) {
		return false;
	}

	try {
		return (await loadApproved({ identity })) > ZERO;
	} catch (_: unknown) {
		return false;
	}
};

/**
 * Sets the signer's approval to `limit`, with no expiry: the user's new spending limit, 0 to
 * revoke it. The approval states the one it replaces, so the ledger refuses it when the approval
 * left has changed since it was read, for example after a charge or from a wrong query answer: it
 * never allows more than the user set.
 */
export const setSpendingLimit = async ({
	identity,
	approved,
	limit
}: {
	identity: NullishIdentity;
	// The approval left, as read.
	approved: bigint;
	limit: bigint;
}): Promise<void> => {
	await approve({
		identity,
		ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
		spender: signerAccount(),
		amount: limit,
		expectedAllowance: approved
	});
};
