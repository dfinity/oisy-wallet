import { saveTokens, type ManageTokensSaveParams } from '$lib/services/manage-tokens.services';
import { saveUserTokens } from '$sol/services/spl-user-tokens.services';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';

export const saveSplUserTokens = async ({
	tokens,
	...rest
}: {
	tokens: SplTokenToggleable[];
} & ManageTokensSaveParams) => {
	await saveTokens({
		...rest,
		tokens,
		save: saveUserTokens
	});
};
