import { trackEvent } from '$lib/services/analytics.services';
import { nullishSignOut } from '$lib/services/auth.services';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import { errorDetailToString } from '$lib/utils/error.utils';
import type { Identity } from '@dfinity/agent';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Higher-order function to handle common authentication, tracking, and error handling patterns
 */
export const wrapCallWith =
	<T extends { identity: Identity }, R>({
		methodToCall,
		toastErrorMessage,
		identity,
		trackEventNames = {}
	}: {
		methodToCall: (params: T & { identity: Identity }) => Promise<R>;
		toastErrorMessage?: string;
		identity: OptionIdentity;
		trackEventNames?: { success?: string; error?: string };
	}) =>
	async (params: Omit<T, 'identity'>): Promise<R | undefined> => {
		if (isNullish(identity)) {
			await nullishSignOut();
			return undefined;
		}

		try {
			// We know this is safe because we're adding the identity property
			const paramsWithIdentity = {
				...params,
				identity
			} as T;

			const result = await methodToCall(paramsWithIdentity);

			if (nonNullish(trackEventNames.success)) {
				trackEvent({ name: trackEventNames.success });
			}

			return result;
		} catch (err: unknown) {
			if (nonNullish(trackEventNames.error)) {
				trackEvent({
					name: trackEventNames.error,
					metadata: { error: `${errorDetailToString(err)}` }
				});
			}

			if (nonNullish(toastErrorMessage)) {
				toastsError({ msg: { text: toastErrorMessage }, err });
				return;
			}

			throw err;
		}
	};
