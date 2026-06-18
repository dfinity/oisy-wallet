import { isSignerCanisterPaymentError } from '$lib/canisters/signer.errors';
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
 * When the chain-fusion signer cannot sign because OISY's backend is out of cycles, every
 * signing flow fails wallet-wide. Show one calm, generic toast for that case instead of the
 * raw `Ledger error: …` text; otherwise defer to the caller's own error handling.
 *
 * The signer-unavailable toast deliberately omits `err` so the scary ledger detail is not
 * appended — the error is still logged to the console by the fallback / underlying caller.
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
		toastsError({ msg: { text: get(i18n).sign.error.unavailable } });
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
