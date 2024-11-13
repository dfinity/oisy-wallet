import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token } from '$lib/types/token';
import { BigNumber } from '@ethersproject/bignumber';
import { derived, writable, type Readable } from 'svelte/store';

export interface ConvertData {
	sourceToken: Token;
	destinationToken: Token;
}

export const initConvertContext = (convertData: ConvertData): ConvertContext => {
	const data = writable<ConvertData>(convertData);

	const sourceToken = derived([data], ([{ sourceToken }]) => sourceToken);
	const destinationToken = derived([data], ([{ destinationToken }]) => destinationToken);

	const sourceTokenBalance = derived(
		[balancesStore, sourceToken],
		([$balancesStore, $sourceToken]) => $balancesStore?.[$sourceToken.id]?.data
	);
	const destinationTokenBalance = derived(
		[balancesStore, destinationToken],
		([$balancesStore, $destinationToken]) => $balancesStore?.[$destinationToken.id]?.data
	);

	const sourceTokenExchangeRate = derived(
		[exchanges, sourceToken],
		([$exchanges, $sourceToken]) => $exchanges?.[$sourceToken.id]?.usd
	);
	const destinationTokenExchangeRate = derived(
		[exchanges, destinationToken],
		([$exchanges, $destinationToken]) => $exchanges?.[$destinationToken.id]?.usd
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
