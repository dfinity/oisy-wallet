import { saveCustomTokens as saveCustomErc1155Tokens } from '$eth/services/erc1155-custom-tokens.services';
import { saveCustomTokens as saveCustomErc20Tokens } from '$eth/services/erc20-custom-tokens.services';
import { saveUserTokens, type SaveUserToken } from '$eth/services/erc20-user-tokens.services';
import { saveCustomTokens as saveCustomErc721Tokens } from '$eth/services/erc721-custom-tokens.services';
import type { SaveErc1155CustomToken } from '$eth/types/erc1155-custom-token';
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
		save: saveCustomErc20Tokens
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
		save: saveCustomErc721Tokens
	});
};

export const saveErc1155CustomTokens = async ({
	tokens,
	...rest
}: {
	tokens: SaveErc1155CustomToken[];
} & ManageTokensSaveParams) => {
	await saveTokens({
		...rest,
		tokens,
		save: saveCustomErc1155Tokens
	});
};
