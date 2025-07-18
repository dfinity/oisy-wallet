import { saveCustomTokens } from '$icp/services/ic-custom-tokens.services';
import { saveTokens, type ManageTokensSaveParams } from '$lib/services/manage-tokens.services';
import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';

export const saveIcrcCustomTokens = async ({
	tokens,
	...rest
}: {
	tokens: SaveCustomTokenWithKey[];
} & ManageTokensSaveParams) => {
	await saveTokens({
		...rest,
		tokens,
		save: saveCustomTokens
	});
};
