import type { Network } from '$lib/types/network';
import type { TokenUi } from '$lib/types/token-ui';

export type CardData = Pick<
	TokenUi,
	| 'name'
	| 'symbol'
	| 'decimals'
	| 'icon'
	| 'oisyName'
	| 'oisySymbol'
	| 'balance'
	| 'usdBalance'
	| 'usdPrice'
> &
	Partial<Pick<TokenUi, 'network'>> & {
		tokenCount?: number;
		networks?: Network[];
	};
