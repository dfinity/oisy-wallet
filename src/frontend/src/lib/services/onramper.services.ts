import { fetchOnramperSupportedCryptos } from '$lib/rest/onramper.rest';
import type {
	OnramperIdsByAddress,
	OnramperIdsLoading,
	OnramperTransactionType
} from '$lib/types/onramper';
import { consoleWarn } from '$lib/utils/console.utils';
import { indexOnramperIds } from '$lib/utils/onramper.utils';

// Kept in memory until the page is reloaded, never stored: the lists hold OnRamper's data only,
// nothing of the user. Holding the promise lets a request still in flight be shared by the next
// opening, and a request that failed is dropped so that the next opening asks again.
const lists = new Map<OnramperTransactionType, Promise<OnramperIdsByAddress>>();

const loadList = async (
	type: OnramperTransactionType
): Promise<OnramperIdsByAddress | undefined> => {
	const list = lists.get(type) ?? fetchOnramperSupportedCryptos({ type }).then(indexOnramperIds);
	lists.set(type, list);

	try {
		return await list;
	} catch (err: unknown) {
		if (lists.get(type) === list) {
			lists.delete(type);
		}

		consoleWarn(`Could not load the OnRamper ${type} list.`, err);

		return undefined;
	}
};

/**
 * Load OnRamper's ids of the tokens it buys and of the ones it sells, indexed by network and
 * address, for the tokens that have no built-in OnRamper id.
 *
 * Each list is fetched once and kept in memory. Never rejects: a list that could not be loaded is
 * missing, and its tab then offers the tokens with a built-in id only.
 *
 * @returns OnRamper's ids from its Buy and its Sell list, each settling on its own, so that a list
 * that came in can be used while the other is still loading.
 */
export const loadOnramperIds = (): OnramperIdsLoading => ({
	buy: loadList('buy'),
	sell: loadList('sell')
});

export const resetOnramperIds = () => {
	lists.clear();
};
