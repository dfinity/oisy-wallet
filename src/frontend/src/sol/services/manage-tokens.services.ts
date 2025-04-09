import { saveTokens, type ManageTokensSaveParams } from '$lib/services/manage-tokens.services';
import { saveCustomTokens } from '$sol/services/spl-custom-tokens.services';
import type { SaveSplCustomToken } from '$sol/types/spl-custom-token';

export const saveSplCustomTokens = async ({
	tokens,
	...rest
}: {
	tokens: SaveSplCustomToken[];
} & ManageTokensSaveParams) => {
	await saveTokens({
		...rest,
		tokens,
		save: saveCustomTokens
	});
};
