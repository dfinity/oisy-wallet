import type { IcCanistersStrict, IcToken } from '$icp/types/ic-token';
import { IcCanistersStrictSchema, IcTokenSchema } from '$icp/validation/ic-token.validation';
import type { Token } from '$lib/types/token';

export const isIcToken = (token: Token): token is IcToken => {
	const { success } = IcTokenSchema.safeParse(token);
	return success;
};

export const isIcTokenCanistersStrict = (token: IcToken): token is IcToken & IcCanistersStrict => {
	const { success } = IcCanistersStrictSchema.safeParse(token);
	return success;
};
