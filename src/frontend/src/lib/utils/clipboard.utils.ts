import { toastsShow } from '$lib/stores/toasts.store';
import { copyText } from '$lib/utils/share.utils';

export const copyToClipboard = async ({ value, text }: { value: string; text: string }) => {
	await copyText(value);

	toastsShow({
		text: text,
		level: 'success',
		duration: 2000
	});
};
