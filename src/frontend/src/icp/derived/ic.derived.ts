import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { authStore } from '$lib/stores/auth.store';
import { encodeIcrcAccount, type IcrcAccount } from '@dfinity/ledger-icrc';
import { nonNullish } from '@dfinity/utils';
import type { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { derived, type Readable } from 'svelte/store';

export const icpAccountIdentifier: Readable<AccountIdentifier | undefined> = derived(
	authStore,
	({ identity }) =>
		nonNullish(identity) ? getAccountIdentifier(identity.getPrincipal()) : undefined
);

export const icpAccountIdentifierText: Readable<string | undefined> = derived(
	icpAccountIdentifier,
	($icpAccountIdentifierStore) => $icpAccountIdentifierStore?.toHex()
);

export const icrcAccount: Readable<IcrcAccount | undefined> = derived(authStore, ({ identity }) =>
	nonNullish(identity) ? getIcrcAccount(identity.getPrincipal()) : undefined
);

export const icrcAccountIdentifierText: Readable<string | undefined> = derived(
	icrcAccount,
	($icrcAccountStore) =>
		nonNullish($icrcAccountStore) ? encodeIcrcAccount($icrcAccountStore) : undefined
);
