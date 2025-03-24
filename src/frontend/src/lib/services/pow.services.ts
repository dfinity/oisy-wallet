import {
	TRACK_COUNT_SIGN_IN_SUCCESS,
	TRACK_SIGN_IN_CANCELLED_COUNT,
	TRACK_SIGN_IN_ERROR_COUNT
} from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { authStore, type AuthSignInParams } from '$lib/stores/auth.store';
import { busy } from '$lib/stores/busy.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsClean, toastsError } from '$lib/stores/toasts.store';
import { get } from 'svelte/store';

export const signIn = async (
	params: AuthSignInParams
): Promise<{ success: 'ok' | 'cancelled' | 'error'; err?: unknown }> => {
	busy.show();

	try {
		await authStore.signIn(params);

		await trackEvent({
			name: TRACK_COUNT_SIGN_IN_SUCCESS
		});

		// We clean previous messages in case user was signed out automatically before sign-in again.
		toastsClean();

		return { success: 'ok' };
	} catch (err: unknown) {
		if (err === 'UserInterrupt') {
			await trackEvent({
				name: TRACK_SIGN_IN_CANCELLED_COUNT
			});

			// We do not display an error if user explicitly cancelled the process of sign-in
			return { success: 'cancelled' };
		}

		await trackEvent({
			name: TRACK_SIGN_IN_ERROR_COUNT
		});

		toastsError({
			msg: { text: get(i18n).auth.error.error_while_signing_in },
			err
		});

		return { success: 'error', err };
	} finally {
		busy.stop();
	}
};
