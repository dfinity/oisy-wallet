import { saveUserTokens, type SaveUserToken } from '$eth/services/erc20-user-tokens-services';
import { saveCustomTokens } from '$icp/services/ic-custom-tokens.services';
import { saveTokens, type ManageTokensSaveParams } from '$lib/services/manage-tokens.services';
import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';

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
