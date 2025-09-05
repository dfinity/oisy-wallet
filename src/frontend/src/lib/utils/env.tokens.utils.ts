import { LOCAL } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';

export const defineSupportedTokens = <T extends Token>({
	mainnetFlag,
	mainnetTokens,
	testnetTokens = [],
	localTokens = []
}: {
	mainnetFlag: boolean;
	mainnetTokens: T[];
	testnetTokens?: T[];
	localTokens?: T[];
}): T[] => [...(mainnetFlag ? mainnetTokens : []), ...testnetTokens, ...(LOCAL ? localTokens : [])];
