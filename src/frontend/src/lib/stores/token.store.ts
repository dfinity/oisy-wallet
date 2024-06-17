import type { OptionToken } from '$lib/types/token';
import { writable } from 'svelte/store';

export const token = writable<OptionToken>(undefined);
