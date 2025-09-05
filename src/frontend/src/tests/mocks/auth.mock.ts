import * as authStore from '$lib/derived/auth.derived';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { Identity } from '@dfinity/agent';
import { readable } from 'svelte/store';

export const mockAuthStore = (value: Identity | null = mockIdentity) =>
	vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));

export const mockAuthSignedIn = (value = true) =>
	vi.spyOn(authStore, 'authSignedIn', 'get').mockImplementation(() => readable(value));
