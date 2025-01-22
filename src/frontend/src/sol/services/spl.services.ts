import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { ResultSuccess } from '$lib/types/utils';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import { get } from 'svelte/store';

export const loadSplTokens = async (): Promise<void> => {
	await Promise.all([loadDefaultSplTokens()]);
};

const loadDefaultSplTokens = (): ResultSuccess => {
	try {
		splDefaultTokensStore.set(SPL_TOKENS);
	} catch (err: unknown) {
		splDefaultTokensStore.reset();

		toastsError({
			msg: { text: get(i18n).init.error.spl_contract },
			err
		});

		return { success: false };
	}

	return { success: true };
};
