import {
	isSignerCanisterAllowanceError,
	isSignerCanisterPaymentError
} from '$lib/canisters/signer.errors';
import { i18n } from '$lib/stores/i18n.store';
import type { ToastMsg } from '$lib/types/toast';
import { consoleError } from '$lib/utils/console.utils';
import { errorDetailToString } from '$lib/utils/error.utils';
import { toastsStore } from '@dfinity/gix-components';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const toastsShow = (msg: ToastMsg): symbol => toastsStore.show(msg);

interface ToastsErrorParams {
	msg: Omit<ToastMsg, 'level'>;
	err?: unknown;
}
export const toastsError = ({ msg: { text, ...rest }, err }: ToastsErrorParams): symbol => {
	if (nonNullish(err)) {
		consoleError(err);
	}

	return toastsStore.show({
		text: `${text}${nonNullish(err) ? ` / ${errorDetailToString(err)}` : ''}`,
		...rest,
		level: 'error'
	});
};

/**
 * When the chain-fusion signer cannot be paid for a signing call, show one calm, generic toast
 * instead of the raw `Ledger error: …` text; otherwise defer to the caller's own error handling.
 *
 * Two payment cases get distinct messages:
 * - exhausted per-user allowance (`isSignerCanisterAllowanceError`) → a "signing limit reached" message;
 * - any other payment failure (e.g. the backend out of cycles, a wallet-wide outage) → "temporarily unavailable".
 *
 * Both deliberately omit `err` so the scary ledger detail is not appended — the error is still
 * logged to the console here (and by the underlying caller).
 */
export const toastsSignerUnavailableOr = ({
	err,
	fallback
}: {
	err: unknown;
	fallback: () => void;
}): void => {
	if (isSignerCanisterPaymentError(err)) {
		consoleError(err);
		toastsError({
			msg: {
				text: isSignerCanisterAllowanceError(err)
					? get(i18n).sign.error.limit_reached
					: get(i18n).sign.error.unavailable
			}
		});
		return;
	}

	fallback();
};

export const toastsErrorNoTrace = ({ msg, err }: ToastsErrorParams) => {
	consoleError(`${msg.text}:`, err);

	return toastsError({
		msg
	});
};

export const toastsClean = () => toastsStore.reset(['success', 'warn', 'info']);

export const toastsHide = (ids: symbol[]) => ids.forEach((id) => toastsStore.hide(id));
