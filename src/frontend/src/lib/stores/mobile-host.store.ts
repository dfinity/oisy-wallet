import type { MobileNavigationRequest } from '$lib/schema/mobile-host.schema';
import { writable } from 'svelte/store';

// Native selections are requests; the shared Svelte router owns page history.
export const mobileScreenStore = writable<MobileNavigationRequest>({
	screen: 'wallet',
	requestId: 0
});
// Installed only for the lifetime of the authenticated shared web host.
export const mobileBackStore = writable<(() => void) | undefined>();

// A recoverable startup failure replaces private routes until a fresh document retries.
export const mobileRuntimeRecoveryStore = writable(false);
