import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { derived, writable, type Readable } from 'svelte/store';

export interface ConvertData {
	sourceToken: Token;
	destinationToken: Token;
}

export interface ConvertStore extends Readable<ConvertData> {
	set: (data: ConvertData) => void;
}

export const initConvertStore = (data: ConvertData): ConvertStore => {
	const { subscribe, set: setStore } = writable<ConvertData>(data);

	return {
		subscribe,

		set(data: ConvertData) {
			setStore(data);
		}
	};
};

export const initConvertContext = (convertData: ConvertData): ConvertContext => {
	const convertStore = initConvertStore(convertData);

	const sourceToken = derived([convertStore], ([{ sourceToken }]) => sourceToken);
	const destinationToken = derived([convertStore], ([{ destinationToken }]) => destinationToken);

	const sourceTokenBalance = derived(
		[balancesStore, sourceToken],
		([$balancesStore, $sourceToken]) =>
			nonNullish($sourceToken) ? $balancesStore?.[$sourceToken.id]?.data : undefined
	);
	const destinationTokenBalance = derived(
		[balancesStore, destinationToken],
		([$balancesStore, $destinationToken]) =>
			nonNullish($destinationToken) ? $balancesStore?.[$destinationToken.id]?.data : undefined
	);

	const sourceTokenExchangeRate = derived(
		[exchanges, sourceToken],
		([$exchanges, $sourceToken]) => $exchanges?.[$sourceToken.id]?.usd
	);
	const destinationTokenExchangeRate = derived(
		[exchanges, destinationToken],
		([$exchanges, $destinationToken]) =>
			nonNullish($destinationToken) ? $exchanges?.[$destinationToken.id]?.usd : undefined
	);

	return {
		sourceToken,
		destinationToken,
		sourceTokenBalance,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate
	};
};

export interface ConvertContext {
	sourceToken: Readable<Token>;
	destinationToken: Readable<Token>;
	sourceTokenBalance: Readable<BigNumber | undefined>;
	destinationTokenBalance: Readable<BigNumber | undefined>;
	sourceTokenExchangeRate: Readable<number | undefined>;
	destinationTokenExchangeRate: Readable<number | undefined>;
}

export const CONVERT_CONTEXT_KEY = Symbol('convert');
