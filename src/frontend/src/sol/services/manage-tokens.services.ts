import { saveTokens, type ManageTokensSaveParams } from '$lib/services/manage-tokens.services';
import { saveUserTokens } from '$sol/services/spl-user-tokens.services';
import type { SaveSplUserToken } from '$sol/types/spl-user-token';

export const saveSplUserTokens = async ({
	tokens,
	...rest
}: {
	tokens: SaveSplUserToken[];
} & ManageTokensSaveParams) => {
	await saveTokens({
		...rest,
		tokens,
		save: saveUserTokens
	});
};
