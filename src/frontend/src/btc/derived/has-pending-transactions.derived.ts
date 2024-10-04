import { pendingTransactionsStore } from '$btc/stores/btc-pending-transactions.store';
import { LOCAL } from '$lib/constants/app.constants';
import {
	btcAddressMainnet,
	btcAddressRegtest,
	btcAddressTestnet
} from '$lib/derived/address.derived';
import { testnets } from '$lib/derived/testnets.derived';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const initHasPendingTransactions = (address: string): Readable<boolean | 'loading'> =>
	derived(
		[btcAddressMainnet, btcAddressTestnet, btcAddressRegtest, testnets, pendingTransactionsStore],
		([
			$btcAddressMainnet,
			$btcAddressTestnet,
			$btcAddressRegtest,
			$testnets,
			$pendingTransactionsStore
		]) => {
			const pendingTransactionsData = $pendingTransactionsStore[address];

			if (nonNullish(pendingTransactionsData)) {
				return pendingTransactionsData.data.length > 0;
			}

			if (!$testnets) {
				if (isNullish($btcAddressMainnet)) {
					// Return loading while we don't have btc addresses and we can't tell
					// whether there are pending transactions for a specific address.
					return 'loading';
				}
				if ($btcAddressMainnet !== address) {
					// If the address is not a bitcoin address, there are no pending transactions.
					return false;
				}

				// We already checked that the pendingTransaction are present at the top.
				// If we reach here is because they are not present.
				return 'loading';
			}
			if (
				isNullish($btcAddressMainnet) ||
				isNullish($btcAddressTestnet) ||
				(LOCAL && isNullish($btcAddressRegtest))
			) {
				// Return loading while we don't have btc addresses and we can't tell
				// whether there are pending transactions for a specific address.
				return 'loading';
			}

			if (
				$btcAddressMainnet !== address &&
				$btcAddressTestnet !== address &&
				$btcAddressRegtest !== address
			) {
				// If the address is not a bitcoin address, there are no pending transactions.
				return false;
			}

			// We already checked that the pendingTransaction are present at the top.
			// If we reach here is because they are not present.
			return 'loading';
		}
	);
