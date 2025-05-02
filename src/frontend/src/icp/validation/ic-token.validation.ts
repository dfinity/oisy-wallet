import {
	IcCanistersStrictSchema,
	IcCkTokenSchema,
	IcTokenSchema
} from '$icp/schema/ic-token.schema';
import type { IcCanistersStrict, IcCkToken, IcToken } from '$icp/types/ic-token';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export const isIcToken = (token: Token): token is IcToken => {
	const { success } = IcTokenSchema.safeParse(token);
	return success;
};

export const isNotIcToken = (token: Token): token is Exclude<Token, IcToken> => !isIcToken(token);

export const isIcTokenCanistersStrict = (token: IcToken): token is IcToken & IcCanistersStrict => {
	const { success } = IcCanistersStrictSchema.safeParse(token);
	return success;
};

export const isNotIcTokenCanistersStrict = (
	token: IcToken
): token is Exclude<IcToken, IcToken & IcCanistersStrict> => !isIcTokenCanistersStrict(token);

export const isIcCkToken = (token: Token): token is IcCkToken => {
	const { success } = IcCkTokenSchema.safeParse(token);
	return success;
};

export const hasIndexCanister = (token: IcToken): boolean =>
	nonNullish(token) && isIcTokenCanistersStrict(token);

export const hasNoIndexCanister = (token: IcToken): boolean => !hasIndexCanister(token);
