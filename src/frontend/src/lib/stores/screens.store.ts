import type { ScreensKeyType } from '$lib/types/screens';
import { writable } from 'svelte/store';

export const screensStore = writable<ScreensKeyType>('xs');
