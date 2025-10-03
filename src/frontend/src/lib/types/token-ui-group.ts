import type { TokenUi } from '$lib/types/token-ui';
import type { NonEmptyArray } from '$lib/types/utils';
import type { TokenFinancialData } from '$lib/types/token';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';

export type TokenUiGroup = {
	id: TokenGroupId;
	decimals: number;
	groupData: TokenGroupData;
	tokens: NonEmptyArray<TokenUi>;
} & TokenFinancialData;

export type TokenUiOrGroupUi = { token: TokenUi } | { group: TokenUiGroup };
