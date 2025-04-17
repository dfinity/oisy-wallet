import type { Network } from '$lib/types/network';
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
	| 'groupData'
> & {
	tokenCount?: number;
	networks?: Network[];
};
