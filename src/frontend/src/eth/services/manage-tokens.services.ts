import { saveUserTokens, type SaveUserToken } from '$eth/services/erc20-user-tokens.services';
import { saveTokens, type ManageTokensSaveParams } from '$lib/services/manage-tokens.services';
import { saveCustomTokens } from '$eth/services/erc721-custom-tokens.services';

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

export const saveErc721CustomTokens = async ({
	tokens,
	...rest
}: {
	tokens: SaveUserToken[];
} & ManageTokensSaveParams) => {
	await saveTokens({
		...rest,
		tokens,
		save: saveCustomTokens
	})
}
