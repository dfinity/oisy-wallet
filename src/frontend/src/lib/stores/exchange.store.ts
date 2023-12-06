import type { CoingeckoSimplePrice } from '$lib/types/coingecko';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type ExchangeData = Record<TokenId, CoingeckoSimplePrice | undefined> | undefined | null;

export interface ExchangeStore extends Readable<ExchangeData> {
	set: (params: { tokenId: TokenId; currentPrice: CoingeckoSimplePrice | undefined }[]) => void;
	reset: () => void;
}

const initExchangeStore = (): ExchangeStore => {
	const { subscribe, set, update } = writable<ExchangeData>(undefined);

	return {
		set: (
			tokensPrice: {
				tokenId: TokenId;
				currentPrice: CoingeckoSimplePrice | undefined;
			}[]
		) =>
			update((state) => ({
				...(nonNullish(state) && state),
				...tokensPrice.reduce(
					(acc, { tokenId, currentPrice }) => ({
						...acc,
						[tokenId]: currentPrice
					}),
					{}
				)
			})),
		reset: () => set(null),
		subscribe
	};
};

export const exchangeStore = initExchangeStore();
