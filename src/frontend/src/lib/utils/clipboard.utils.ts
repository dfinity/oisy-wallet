import { toastsShow } from '$lib/stores/toasts.store';
import { copyText } from '$lib/utils/share.utils';

export const copyToClipboard = async ({
	value,
	text,
	overlay = false
}: {
	value: string;
	text: string;
	// Render the confirmation toast above overlays (e.g. when copying from within a
	// bottom sheet). See ToastMsg `overlay`.
	overlay?: boolean;
}) => {
	await copyText(value);

	toastsShow({
		text,
		level: 'success',
		duration: 2000,
		...(overlay && { overlay: true })
	});
};
