import { pendingTransactionsStore } from '$btc/stores/btc-pending-transactions.store';
import { LOCAL } from '$lib/constants/app.constants';
import {
	btcAddressMainnet,
	btcAddressRegtest,
	btcAddressTestnet
} from '$lib/derived/address.derived';
import { testnets } from '$lib/derived/testnets.derived';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const hasPendingTransactions = (address: string): Readable<boolean | 'loading'> =>
	derived(
		[btcAddressMainnet, btcAddressTestnet, btcAddressRegtest, testnets, pendingTransactionsStore],
		([
			$btcAddressMainnet,
			$btcAddressTestnet,
			$btcAddressRegtest,
			$testnets,
			$pendingTransactionsStore
		]) => {
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
				const pendingTransactions = $pendingTransactionsStore[address];
				if (isNullish(pendingTransactions)) {
					// Address is bitcoin but we pending transactions are not loaded yet.
					return 'loading';
				}
				return pendingTransactions.data.length > 0;
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

			const pendingTransactions = $pendingTransactionsStore[address];
			if (isNullish(pendingTransactions)) {
				// Address is bitcoin but we pending transactions are not loaded yet.
				return 'loading';
			}
			return pendingTransactions.data.length > 0;
		}
	);
