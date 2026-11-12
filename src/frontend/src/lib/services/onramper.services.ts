import { fetchOnramperSupportedCryptos } from '$lib/rest/onramper.rest';
import type {
	OnramperIds,
	OnramperIdsByAddress,
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
 * Each list is fetched once and kept in memory. Never throws: a list that could not be loaded is
 * missing, and Buy/Sell then offers the tokens with a built-in id only.
 *
 * @returns OnRamper's ids from its Buy and its Sell list.
 */
export const loadOnramperIds = async (): Promise<OnramperIds> => {
	const [buy, sell] = await Promise.all([loadList('buy'), loadList('sell')]);

	return { buy, sell };
};

export const resetOnramperIds = () => {
	lists.clear();
};
