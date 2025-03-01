import type { TokenFinancialData, TokenId, TokenUi } from '$lib/types/token';

//todo: separate typing from token id
type GroupId = TokenId;

export type TokenUiGroup = {
	id: GroupId;
	nativeToken: TokenUi;
	tokens: [TokenUi, ...TokenUi[]];
} & TokenFinancialData;

export type TokenUiOrGroupUi = TokenUi | TokenUiGroup;
