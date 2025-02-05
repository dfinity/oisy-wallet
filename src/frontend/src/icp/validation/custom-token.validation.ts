import { SaveCustomTokenSchema } from '$icp/schema/custom-token.schema';
import type { IcToken } from '$icp/types/ic-token';

export const isSaveCustomToken = (token: IcToken) => {
	const { success } = SaveCustomTokenSchema.safeParse(token);
	return success;
};
