import { saveUserTokens, type SaveUserToken } from '$eth/services/erc20-user-tokens.services';
import { saveTokens, type ManageTokensSaveParams } from '$lib/services/manage-tokens.services';

export const saveErc20UserTokens = async ({
	tokens,
	...rest
}: {
	tokens: SaveUserToken[];
} & ManageTokensSaveParams) => {
	await saveTokens({
		...rest,
		tokens,
		save: saveUserTokens
	});
};
