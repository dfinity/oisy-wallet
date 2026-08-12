import { onLoadTransactionsError } from '$icp/services/ic-transactions.services';
import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { getIdbIcTransactions } from '$lib/api/idb-transactions.api';
import { syncWalletFromIdbCache } from '$lib/services/listener.services';
import { balancesStore } from '$lib/stores/balances.store';
import type { GetIdbTransactionsParams } from '$lib/types/idb-transactions';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import {
	isSimulatedFailure,
	qaLog,
	simulatedCanisterFailuresEnabled,
	simulatedFailuresStore
} from '$lib/utils/simulated-canister-failures.utils';
import { isNullish, jsonReviver } from '@dfinity/utils';
import { get } from 'svelte/store';

export const syncWallet = ({
	data: rawData,
	tokenId
}: {
	data: PostMessageDataResponseWallet;
	tokenId: TokenId;
}) => {
	// QA harness - DO NOT MERGE.
	const data = simulateWalletFailure({ data: rawData, tokenId });

	if (isNullish(data)) {
		return;
	}

	const {
		wallet: {
			balance: { certified, data: balance },
			newTransactions,
			transactionsUnavailable
		}
	} = data;

	balancesStore.batchSet({
		id: tokenId,
		data: {
			data: balance,
			certified
		}
	});

	if (isNullish(newTransactions)) {
		// The scheduler runs on the Ledger canister only, because the token has no Index canister at
		// all. That is a permanent property of the token, not an outage, so it is not counted - and
		// any streak recorded while it did have one is void.
		icTransactionsStore.nullify(tokenId);
		icTransactionsStatusStore.succeed(tokenId);
		return;
	}

	if (transactionsUnavailable === true) {
		icTransactionsStatusStore.fail(tokenId);

		// QA harness - DO NOT MERGE.
		qaLog(
			`${tokenId.description}: transactions unavailable, consecutive failures now`,
			get(icTransactionsStatusStore)[tokenId]
		);
	} else {
		icTransactionsStatusStore.succeed(tokenId);
	}

	icTransactionsStore.prepend({
		tokenId,
		transactions: JSON.parse(newTransactions, jsonReviver)
	});
};

/**
 * QA harness - DO NOT MERGE.
 *
 * Rewrites the worker's payload into what it would have posted had the canister failed. Returns
 * `undefined` when the whole sync should be treated as failed, i.e. for a Ledger failure.
 */
const simulateWalletFailure = ({
	data,
	tokenId
}: {
	data: PostMessageDataResponseWallet;
	tokenId: TokenId;
}): PostMessageDataResponseWallet | undefined => {
	if (!simulatedCanisterFailuresEnabled) {
		return data;
	}

	const failures = get(simulatedFailuresStore);

	if (isSimulatedFailure({ tokenId, kind: 'ledger', failures })) {
		qaLog(`${tokenId.description}: simulating a Ledger canister failure`);

		onLoadTransactionsError({
			tokenId,
			error: new Error(`[QA harness] Simulated failure: Ledger canister of ${tokenId.description}`)
		});

		return undefined;
	}

	if (!isSimulatedFailure({ tokenId, kind: 'index', failures })) {
		return data;
	}

	qaLog(`${tokenId.description}: simulating an Index canister failure`);

	// Exactly what the worker posts when the Index canister does not answer: the Ledger balance,
	// no transaction delta, and the marker the UI counts.
	return {
		...data,
		wallet: {
			...data.wallet,
			newTransactions: JSON.stringify([]),
			transactionsUnavailable: true
		}
	};
};

export const syncWalletFromCache = (params: Omit<GetIdbTransactionsParams, 'principal'>) =>
	syncWalletFromIdbCache({
		...params,
		getIdbTransactions: getIdbIcTransactions,
		transactionsStore: icTransactionsStore
	});
