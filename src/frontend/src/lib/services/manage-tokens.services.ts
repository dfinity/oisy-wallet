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

export interface SaveTokensParams<T> {
	progress: (step: ProgressStepsAddToken) => void;
	identity: Identity;
	tokens: [T, ...T[]];
}

export const saveTokens = async <T>({
	tokens,
	save,
	progress,
	modalNext,
	onSuccess,
	onError,
	identity
}: {
	tokens: T[];
	save: (params: SaveTokensParams<T>) => Promise<void>;
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
