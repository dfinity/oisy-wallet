import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import type { TokenId } from '$lib/types/token';
import type { LoadOlderTransactions } from '$lib/types/transactions-pagination';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import { XRP_MAX_SKIPPED_HISTORY_PAGES } from '$xrp/constants/xrp.constants';
import { loadXrpTransactions } from '$xrp/rest/xrpl.rest';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';
import { mapXrpTransaction } from '$xrp/utils/xrp-transaction.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

interface XrpPager {
	// What the marker was handed out for. A marker resumes the listing of the account it came from
	// only, so a pager for another address starts over rather than resuming.
	address: XrpAddress;
	marker?: unknown;
	ended: boolean;
	// The oldest payment the pager has walked through. It pages from the newest transaction down, so
	// everything newer than this is loaded — which is what a floor is compared with.
	oldestTimestamp?: bigint;
	inFlight?: Promise<ResultSuccess>;
}

// One per token, shared by the Activity list and the token's own page: both page the same account
// into the same store. Kept here rather than derived from the store, like the Solana pagers: rows
// the list does not show never reach the store, so "its oldest row" does not move past them.
const pagers = new Map<TokenId, XrpPager>();

/**
 * Drops the pager of a token whose rows were cleared, so that its next page is the newest again.
 * Its marker points below rows the store no longer holds, and resuming from it would leave them out.
 */
export const resetXrpHistoryPager = (tokenId: TokenId) => {
	pagers.delete(tokenId);
};

const pagerFor = ({ tokenId, address }: { tokenId: TokenId; address: XrpAddress }): XrpPager => {
	const existing = pagers.get(tokenId);

	if (nonNullish(existing) && existing.address === address) {
		return existing;
	}

	const pager: XrpPager = { address, ended: false };

	pagers.set(tokenId, pager);

	return pager;
};

const reachedFloor = ({
	pager: { oldestTimestamp },
	minTimestamp
}: {
	pager: XrpPager;
	minTimestamp?: number;
}): boolean =>
	nonNullish(minTimestamp) &&
	nonNullish(oldestTimestamp) &&
	normalizeTimestampToSeconds(oldestTimestamp) <= normalizeTimestampToSeconds(minTimestamp);

// Resolves to how many rows are new to the store, or to nothing when the pager was replaced while
// the page was on its way: what it brought was asked for an account the store no longer holds.
const pageOnce = async ({
	pager,
	tokenId,
	network,
	isCurrent
}: {
	pager: XrpPager;
	tokenId: TokenId;
	network: XrpNetworkType;
	isCurrent: () => boolean;
}): Promise<number | undefined> => {
	const { address } = pager;

	const { transactions, marker } = await loadXrpTransactions({
		address,
		network,
		limit: Number(WALLET_PAGINATION),
		marker: pager.marker
	});

	if (!isCurrent()) {
		return;
	}

	const rows = transactions
		.map((transaction) => mapXrpTransaction({ transaction, xrpAddress: address }))
		.filter(nonNullish);

	const held = new Set((get(xrpTransactionsStore)?.[tokenId] ?? []).map(({ data: { id } }) => id));

	const newRows = rows.filter(({ id }) => !held.has(id));

	if (newRows.length > 0) {
		xrpTransactionsStore.append({
			tokenId,
			transactions: newRows.map((data) => ({ data, certified: false }))
		});
	}

	// Moved only once the page is written, so that a failure leaves the marker where it was and the
	// same page is asked for again.
	pager.marker = marker;
	pager.ended = isNullish(marker);

	pager.oldestTimestamp = rows.reduce<bigint | undefined>(
		(acc, { timestamp }) =>
			nonNullish(timestamp) && (isNullish(acc) || timestamp < acc) ? timestamp : acc,
		pager.oldestTimestamp
	);

	return newRows.length;
};

// A page can bring nothing new: it can hold only rows the worker already delivered, or only
// transactions the list does not show. Neither is the end, and returning on it would leave the
// caller with no progress, so a few more pages are asked for in the same call.
const pageUntilRows = async ({
	pager,
	tokenId,
	network,
	minTimestamp,
	isCurrent
}: {
	pager: XrpPager;
	tokenId: TokenId;
	network: XrpNetworkType;
	minTimestamp?: number;
	isCurrent: () => boolean;
}): Promise<ResultSuccess> => {
	try {
		for (let page = 0; page <= XRP_MAX_SKIPPED_HISTORY_PAGES; page++) {
			const written = await pageOnce({ pager, tokenId, network, isCurrent });

			if (
				isNullish(written) ||
				pager.ended ||
				written > 0 ||
				reachedFloor({ pager, minTimestamp })
			) {
				break;
			}
		}

		return { success: true };
	} catch (err: unknown) {
		if (!isCurrent()) {
			return { success: true };
		}

		// Not the end of the history: the marker is kept, and the next call asks for the same page. The
		// error goes back with the result, so that a caller that must not stop short can tell it apart.
		consoleError('Failed to load older XRP transactions:', err);

		return { success: false, err };
	}
};

/**
 * Pages the XRP history of a token further back, for the Activity list and the token's own page
 * alike. It walks `account_tx` from the newest transaction down with the marker each page hands
 * back, so the first page it asks for is the one the wallet worker already delivered.
 */
export const loadOlderXrpTransactions: LoadOlderTransactions = async ({
	token: {
		id: tokenId,
		network: { id: networkId }
	},
	minTimestamp,
	signalEnd
}) => {
	const address = get(xrpAddressMainnetStore)?.data;
	const network = mapNetworkIdToNetwork(networkId);

	// Signed out, or no address yet: whatever the pager held was for an account that is gone.
	if (isNullish(address) || isNullish(network)) {
		pagers.delete(tokenId);

		return { success: false };
	}

	const pager = pagerFor({ tokenId, address });

	if (pager.ended) {
		signalEnd();

		return { success: false };
	}

	// Both lists paging in the same round share the page in flight rather than each asking for the
	// next one. Each learns the end from the pager, whichever of them asked for the last page.
	if (isNullish(pager.inFlight)) {
		if (reachedFloor({ pager, minTimestamp })) {
			return { success: false };
		}

		const inFlight = pageUntilRows({
			pager,
			tokenId,
			network,
			minTimestamp,
			isCurrent: () => pagers.get(tokenId) === pager
		}).finally(() => {
			if (pager.inFlight === inFlight) {
				pager.inFlight = undefined;
			}
		});

		pager.inFlight = inFlight;
	}

	const result = await pager.inFlight;

	if (pager.ended && pagers.get(tokenId) === pager) {
		signalEnd();
	}

	return result;
};
