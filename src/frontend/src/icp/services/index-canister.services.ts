import { getTransactions } from '$icp/api/icrc-index-ng.api';
import { balance } from '$icp/api/icrc-ledger.api';
import type { IndexCanisterIdText, LedgerCanisterIdText } from '$icp/types/canister';
import type { Identity } from '@dfinity/agent';
import { type QueryParams } from '@dfinity/utils';

/**
 * This function checks whether the Index canister is not in a "sleepy" state (not syncing new blocks from the Ledger canister).
 *
 * When the Index canister is low on cycles, it may happen that it does not sync new blocks from the Ledger canister.
 * However, it does not return an error, it just provides a zero balance and empty transactions (as per our experience).
 *
 * In these cases, we can check if the Index canister is sleepy by comparing its balance with the Ledger canister balance.
 * There is a small delay between the Ledger canister and the Index canister, so we wait for 5 seconds before checking again.
 *
 * @returns {Promise<boolean>} Whether the Index canister is awake.
 */
// TODO: compare the blocks number instead of balance, when ic-js is upgraded to provide the endpoints for both Ledger and Index canister.
export const isIndexCanisterAwake = async ({
	identity,
	ledgerCanisterId,
	indexCanisterId,
	certified = true
}: {
	identity: Identity;
	ledgerCanisterId: LedgerCanisterIdText;
	indexCanisterId: IndexCanisterIdText;
} & QueryParams): Promise<boolean> => {
	const { balance: indexBalance, transactions } = await getTransactions({
		identity,
		indexCanisterId,
		certified,
		owner: identity.getPrincipal()
	});

	// If the Index canister has a balance or transactions, it is not sleepy (as per our experience).
	if (indexBalance !== 0n || transactions.length > 0) {
		return true;
	}

	const ledgerBalance = await balance({
		identity,
		ledgerCanisterId,
		certified,
		owner: identity.getPrincipal()
	});

	// If the Index canister balance (that is zero at this point) is the same balance as the Ledger canister balance, it is not sleepy.
	if (indexBalance === ledgerBalance) {
		return true;
	}

	// We try again in 5 seconds. That should be enough time for the Index canister to sync with the Ledger canister, if it is not sleepy.
	await new Promise((resolve) => setTimeout(resolve, 5000));

	const { balance: newIndexBalance, transactions: newTransactions } = await getTransactions({
		identity,
		indexCanisterId,
		certified,
		owner: identity.getPrincipal()
	});

	// If the Index canister has a different balance from its previous one (that was zero at this point), or if it has transactions, it is not "sleepy": it is updating its state, syncing with the Ledger canister.
	return newIndexBalance !== indexBalance || newTransactions.length > 0;
};
