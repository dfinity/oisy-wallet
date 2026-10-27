import type { MobileScreen } from '$lib/schema/mobile-host.schema';
import { writable } from 'svelte/store';

// Native selections are requests; the shared Svelte router owns page history.
export const mobileScreenStore = writable<{ screen: MobileScreen; request: number }>({
	screen: 'wallet',
	request: 0
});
