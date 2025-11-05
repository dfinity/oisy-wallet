import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const doPreNavigation = ({ cancel, busy }: { cancel: () => void; busy: boolean }) => {
	if (busy) {
		const userConfirmed = window.confirm(get(i18n).navigation.text.confirm_navigate);
		if (!userConfirmed) {
			cancel();
			return;
		}
	}
	if (nonNullish(get(modalStore)?.type)) {
		modalStore.close();
	}
};
