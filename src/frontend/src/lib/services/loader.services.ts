import type { AllowSigningError } from '$declarations/backend/backend.did';
import { allowSigning } from '$lib/api/backend.api';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { ResultSuccess } from '$lib/types/utils';
import { mapIcrc2ApproveError } from '@dfinity/ledger-icp';
import { get } from 'svelte/store';

/**
 * `allow_signing` needs to be called before get eth address etc. It is currently enough to call it once at boot time.
 * It provides a cycles budget that should be big enough for any reasonable number of calls to the signer.
 * "reasonable" is currently defined as 30 calls, so one call to allow should enable the user to get their eth+btc addresses and then make say 28 transactions.
 */
export const initSignerAllowance = async (): Promise<ResultSuccess> => {
	try {
		const { identity } = get(authStore);

		const result = await allowSigning({ identity });

		if ('Err' in result) {
			const mapErr = (err: AllowSigningError): Error => {
				if ('ApproveError' in err) {
					return mapIcrc2ApproveError(err.ApproveError);
				}

				if ('FailedToContactCyclesLedger' in err) {
					return new Error('TODO_FailedToContactCyclesLedger');
				}

				if ('Other' in err) {
					return new Error(err.Other);
				}

				return new Error();
			};

			const err = mapErr(result.Err);

			toastsError({
				msg: { text: get(i18n).send.error.unexpected },
				err
			});

			return { success: false };
		}
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
