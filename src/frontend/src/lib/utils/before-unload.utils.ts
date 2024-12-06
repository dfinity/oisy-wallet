import { browser } from '$app/environment';
import { dirty } from '$lib/stores/dirty.store';
import { get } from 'svelte/store';

const onBeforeUnload = ($event: BeforeUnloadEvent) => {
	$event.preventDefault();
	return ($event.returnValue = 'Are you sure you want to exit?');
};

const addBeforeUnload = () => {
	window.addEventListener('beforeunload', onBeforeUnload, { capture: true });
};

const removeBeforeUnload = () => {
	window.removeEventListener('beforeunload', onBeforeUnload, { capture: true });
};

export const confirmToCloseBrowser = () => {
	if (!browser) {
		return;
	}

	if (get(dirty)?.dirty) {
		addBeforeUnload();
		return;
	}

	removeBeforeUnload();
};
