import type { Token, TokenFinancialData } from '$lib/types/token';
import type { Nullish } from '@dfinity/zod-schemas';

export type TokenUi<T extends Token = Token> = T & TokenFinancialData;

export type TokenUiGroupable<T extends Token = Token> = Omit<TokenUi<T>, 'groupData'> &
	Required<Pick<TokenUi<T>, 'groupData'>>;

export type OptionTokenUi = Nullish<TokenUi>;
