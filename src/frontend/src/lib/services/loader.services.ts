import { allowSigning } from '$lib/api/backend.api';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { ResultSuccess } from '$lib/types/utils';
import { get } from 'svelte/store';

/**
 * `allow_signing` needs to be called before get eth address etc. It is currently enough to call it once at boot time.
 * It provides a cycles budget that should be big enough for any reasonable number of calls to the signer.
 * "reasonable" is currently defined as 30 calls, so one call to allow should enable the user to get their eth+btc addresses and then make say 28 transactions.
 */
export const initSignerAllowance = async (): Promise<ResultSuccess> => {
	try {
		const { identity } = get(authStore);

		await allowSigning({ identity });

		// TODO: maybe we do not even need a toast given that the user is signed out anyway?
	} catch (err: unknown) {
		toastsError({
			msg: {
				text: get(i18n).init.error.loading_address
			},
			err
		});

		return { success: false };
	}

	return { success: true };
};
