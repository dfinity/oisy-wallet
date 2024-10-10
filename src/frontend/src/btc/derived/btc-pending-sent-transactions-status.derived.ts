import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { LOCAL } from '$lib/constants/app.constants';
import {
	btcAddressMainnet,
	btcAddressRegtest,
	btcAddressTestnet
} from '$lib/derived/address.derived';
import { testnets } from '$lib/derived/testnets.derived';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export enum BtcPendingSentTransactionsStatus {
	PRESENT = 'has-pending-transactions',
	EMPTY = 'empty-pending-transactions',
	LOADING = 'loading',
	ERROR = 'error'
}

export const initPendingSentTransactionsStatus = (
	address: string
): Readable<BtcPendingSentTransactionsStatus> =>
	derived(
		[
			btcAddressMainnet,
			btcAddressTestnet,
			btcAddressRegtest,
			testnets,
			btcPendingSentTransactionsStore
		],
		([
			$btcAddressMainnet,
			$btcAddressTestnet,
			$btcAddressRegtest,
			$testnets,
			$pendingTransactionsStore
		]) => {
			const pendingTransactionsData = $pendingTransactionsStore[address];

			if (nonNullish(pendingTransactionsData)) {
				return pendingTransactionsData.data === null
					? BtcPendingSentTransactionsStatus.ERROR
					: pendingTransactionsData.data.length > 0
						? BtcPendingSentTransactionsStatus.PRESENT
						: BtcPendingSentTransactionsStatus.EMPTY;
			}

			if (!$testnets) {
				if (nonNullish($btcAddressMainnet) && $btcAddressMainnet !== address) {
					// If the address is not a bitcoin address, there are no pending transactions.
					return BtcPendingSentTransactionsStatus.EMPTY;
				}

				// Return loading while we don't have btc addresses and we can't tell
				// whether there are pending transactions for a specific address.
				return BtcPendingSentTransactionsStatus.LOADING;
			}

			// Testnets are enabled.
			const isNotMainnet = nonNullish($btcAddressMainnet) && $btcAddressMainnet !== address;
			const isNotTestnet = nonNullish($btcAddressTestnet) && $btcAddressTestnet !== address;
			const isNotRegtest = nonNullish($btcAddressRegtest) && $btcAddressRegtest !== address;
			const isRegtestEnabled = LOCAL;
			if (isNotMainnet && isNotTestnet && (isNotRegtest || !isRegtestEnabled)) {
				// If the address is not a bitcoin address, there are no pending transactions.
				return BtcPendingSentTransactionsStatus.EMPTY;
			}

			// If we reach here is because either addresses nor pending transactions are loaded
			return BtcPendingSentTransactionsStatus.LOADING;
		}
	);
