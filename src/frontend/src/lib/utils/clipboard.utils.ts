import { i18n } from '$lib/stores/i18n.store';
import { toastsErrorNoTrace, toastsShow } from '$lib/stores/toasts.store';
import { copyText } from '$lib/utils/share.utils';
import { get } from 'svelte/store';

/**
 * @returns whether the value reached the clipboard. The browser rejects the write
 * without permission or focus; that case shows an error toast instead of throwing.
 */
export const copyToClipboard = async ({
	value,
	text
}: {
	value: string;
	text: string;
}): Promise<boolean> => {
	try {
		await copyText(value);
	} catch (err: unknown) {
		toastsErrorNoTrace({ msg: { text: get(i18n).core.error.copy_failed }, err });

		return false;
	}

	toastsShow({
		text,
		level: 'success',
		duration: 2000
	});

	return true;
};
