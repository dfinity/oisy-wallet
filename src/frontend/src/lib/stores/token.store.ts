import type { TokenNetwork } from '$lib/types/token';
import { writable } from 'svelte/store';

export const selectedTokenNetwork = writable<TokenNetwork>('ethereum');
