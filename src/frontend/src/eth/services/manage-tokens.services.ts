import { saveUserTokens, type SaveUserToken } from '$eth/services/erc20-user-tokens.services';
import { saveCustomTokens } from '$eth/services/erc721-custom-tokens.services';
import type { SaveErc20CustomToken } from '$eth/types/erc20-custom-token';
import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
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

export const saveErc20CustomTokens = async ({
	tokens,
	...rest
}: {
	tokens: SaveErc20CustomToken[];
} & ManageTokensSaveParams) => {
	await saveTokens({
		...rest,
		tokens,
		save: saveCustomTokens
	});
};

export const saveErc721CustomTokens = async ({
	tokens,
	...rest
}: {
	tokens: SaveErc721CustomToken[];
} & ManageTokensSaveParams) => {
	await saveTokens({
		...rest,
		tokens,
		save: saveCustomTokens
	});
};
