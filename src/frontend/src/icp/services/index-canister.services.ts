import { getStatus } from '$icp/api/icrc-index-ng.api';
import { getBlocks } from '$icp/api/icrc-ledger.api';
import type { IndexCanisterIdText, LedgerCanisterIdText } from '$icp/types/canister';
import type { Identity } from '@dfinity/agent';
import type { QueryParams } from '@dfinity/utils';

/**
 * This function checks whether the Index canister is not in a "sleepy" state (not syncing new blocks from the Ledger canister).
 *
 * When the Index canister is low on cycles, it may happen that it does not sync new blocks from the Ledger canister.
 * However, it does not return an error, it just provides a zero balance and empty transactions (as per our experience).
 *
 * In these cases, we can check if the Index canister is sleepy by comparing its synced blocks with the Ledger canister total block number.
 * There is a small delay between the Ledger canister and the Index canister, so we wait for 5 seconds before checking again.
 *
 * @returns {Promise<boolean>} Whether the Index canister is awake.
 */
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
	const { num_blocks_synced: indexBlocks } = await getStatus({
		identity,
		indexCanisterId,
		certified
	});

	const { log_length: ledgerBlocks } = await getBlocks({
		identity,
		ledgerCanisterId,
		certified,
		args: []
	});

	// If the Index canister synced blocks number is the same as the Ledger canister total blocks number, it is not sleepy.
	if (indexBlocks === ledgerBlocks) {
		return true;
	}

	// We check again in 5 seconds.
	// That should be enough time for the Index canister to sync with the Ledger canister at least once if it is not sleepy.
	await new Promise((resolve) => setTimeout(resolve, 5000));

	const { num_blocks_synced: newIndexBlocks } = await getStatus({
		identity,
		indexCanisterId,
		certified
	});

	// If the Index canister has a different synced blocks number from its previous one,
	// it is not "sleepy": it is updating its state, syncing with the Ledger canister.
	return newIndexBlocks !== indexBlocks;
};
