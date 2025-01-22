import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { saveTokens, type ManageTokensSaveParams } from '$lib/services/manage-tokens.services';
import type { OptionIdentity } from '$lib/types/identity';
import { saveUserTokens } from '$sol/services/spl-user-tokens.services';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';

export interface ManageTokensSaveParams {
	progress: (step: ProgressStepsAddToken) => void;
	modalNext: () => void;
	onSuccess: () => void;
	onError: () => void;
	identity: OptionIdentity;
}

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
