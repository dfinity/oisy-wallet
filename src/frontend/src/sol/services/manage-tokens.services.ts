import { saveTokens, type ManageTokensSaveParams } from '$lib/services/manage-tokens.services';
import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
import { saveUserTokens } from '$sol/services/spl-user-tokens.services';

export const saveSplUserTokens = async ({
	tokens,
	...rest
}: {
	tokens: SaveCustomTokenWithKey[];
} & ManageTokensSaveParams) => {
	await saveTokens({
		...rest,
		tokens,
		save: saveUserTokens
	});
};
