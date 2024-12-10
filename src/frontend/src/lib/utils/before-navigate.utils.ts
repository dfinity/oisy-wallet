import { get } from 'svelte/store';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';

export const doPreNavigation = (cancel: () => void, busy: boolean) => {
	if (busy) {
		let userConfirmed = window.confirm(get(i18n).navigation.text.confirm_navigate);
		if (userConfirmed) {
			modalStore.close();
		} else {
			cancel();
		}
	} else {
		modalStore.close();
	}
}