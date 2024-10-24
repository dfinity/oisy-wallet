import type { TokenUi } from '$lib/types/token';

export type CardData = Pick<
	TokenUi,
	| 'name'
	| 'symbol'
	| 'decimals'
	| 'icon'
	| 'network'
	| 'oisyName'
	| 'oisySymbol'
	| 'balance'
	| 'usdBalance'
> & {
	tokenCount?: number;
};
