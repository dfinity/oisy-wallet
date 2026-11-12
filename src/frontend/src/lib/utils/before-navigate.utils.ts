import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { get } from 'svelte/store';

export const doPreNavigation = ({
	cancel,
	busy,
	blocking = false
}: {
	cancel: () => void;
	busy: boolean;
	blocking?: boolean;
}) => {
	if (blocking) {
		cancel();
		return;
	}
	if (busy) {
		const userConfirmed = window.confirm(get(i18n).navigation.text.confirm_navigate);
		if (!userConfirmed) {
			cancel();
			return;
		}
	}
	modalStore.close();
};
