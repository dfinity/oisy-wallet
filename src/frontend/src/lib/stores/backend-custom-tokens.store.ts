import type { CustomToken } from '$declarations/backend/backend.did';
import { writable } from 'svelte/store';

export const backendCustomTokens = writable<CustomToken[]>([]);
