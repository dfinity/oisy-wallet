import { saveUserTokens, type SaveUserToken } from '$eth/services/erc20-user-tokens-services';
import { saveCustomTokens, type SaveCustomToken } from '$icp/services/ic-custom-tokens.services';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export interface ManageTokensSaveParams {
	progress: (step: ProgressStepsAddToken) => void;
	modalNext: () => void;
	onSuccess: () => void;
	onError: () => void;
	identity: OptionIdentity;
}

export const saveErc20UserTokens = async ({
	tokens,
	...rest
}: {
	tokens: SaveUserToken[];
} & ManageTokensSaveParams) => {
	const save = (params: {
		progress: (step: ProgressStepsAddToken) => void;
		identity: Identity;
		tokens: [SaveUserToken, ...SaveUserToken[]];
	}): Promise<void> => saveUserTokens(params);

	await saveTokens({
		...rest,
		tokens,
		save
	});
};

export const saveIcrcCustomTokens = async ({
	tokens,
	...rest
}: {
	tokens: SaveCustomToken[];
} & ManageTokensSaveParams) => {
	const save = (params: {
		progress: (step: ProgressStepsAddToken) => void;
		identity: Identity;
		tokens: [SaveCustomToken, ...SaveCustomToken[]];
	}): Promise<void> => saveCustomTokens(params);

	await saveTokens({
		...rest,
		tokens,
		save
	});
};

const saveTokens = async <T>({
	tokens,
	save,
	progress,
	modalNext,
	onSuccess,
	onError,
	identity
}: {
	tokens: T[];
	save: (params: {
		progress: (step: ProgressStepsAddToken) => void;
		identity: Identity;
		tokens: [T, ...T[]];
	}) => Promise<void>;
} & ManageTokensSaveParams) => {
	const $i18n = get(i18n);

	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	if (tokens.length === 0) {
		toastsError({
			msg: { text: $i18n.tokens.manage.error.empty }
		});
		return;
	}

	modalNext();

	try {
		await save({
			progress,
			identity,
			tokens: tokens as [T, ...T[]]
		});

		progress(ProgressStepsAddToken.DONE);

		setTimeout(() => onSuccess(), 750);
	} catch (err: unknown) {
		toastsError({
			msg: { text: $i18n.tokens.error.unexpected },
			err
		});

		onError();
	}
};
