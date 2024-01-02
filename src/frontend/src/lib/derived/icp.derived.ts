import { authStore } from '$lib/stores/auth.store';
import { getAccountIdentifier } from '$lib/utils/icp-account.utils';
import type { AccountIdentifier } from '@dfinity/ledger-icp';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const icpAccountIdentifierStore: Readable<AccountIdentifier | undefined> = derived(
	authStore,
	({ identity }) =>
		nonNullish(identity) ? getAccountIdentifier(identity.getPrincipal()) : undefined
);
