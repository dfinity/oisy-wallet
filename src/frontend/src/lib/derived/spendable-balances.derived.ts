import { ZERO } from '$lib/constants/app.constants';
import { reservedTipAmounts } from '$lib/derived/tips.derived';
import { balancesStore, type BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TokenId } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * Balances with money promised to live tips taken out — what the wallet may
 * actually offer to spend.
 *
 * This is the single place the subtraction happens. The token list and the send
 * context both read it, so the send flow, the swap flow and both MAX controls
 * inherit it rather than each remembering to subtract. The raw `balancesStore`
 * stays untouched for the places that must show what the ledger really holds.
 *
 * The reserve is a courtesy to the sender, not a guarantee to anyone: the same
 * account can be spent from another wallet or another device, so the canister's
 * coverage check at claim time remains the authority.
 */
export const spendableBalances: Readable<CertifiedStoreData<BalancesData>> = derived(
	[balancesStore, reservedTipAmounts],
	([$balances, $reserved]) => {
		if (isNullish($balances)) {
			return $balances;
		}

		// `Object.keys` never returns symbol keys, and a `TokenId` *is* a symbol —
		// using it here made the whole subtraction a silent no-op. The repo's other
		// balance utils walk these maps the same way.
		const tokenIds = Object.getOwnPropertySymbols($reserved) as TokenId[];

		if (tokenIds.length === 0) {
			return $balances;
		}

		return tokenIds.reduce<CertifiedStoreData<BalancesData>>((acc, tokenId) => {
			const entry = acc?.[tokenId];

			if (isNullish(entry)) {
				return acc;
			}

			const reserved = $reserved[tokenId] ?? ZERO;
			// Floored at zero: a balance already spent below its reservation reads as
			// nothing left to spend, never as a negative.
			const data = entry.data > reserved ? entry.data - reserved : ZERO;

			return { ...acc, [tokenId]: { ...entry, data } };
		}, $balances);
	}
);
