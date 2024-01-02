import { tokenStandard } from '$lib/derived/token.derived';
import { authStore } from '$lib/stores/auth.store';
import { getAccountIdentifier } from '$lib/utils/icp-account.utils';
import type { AccountIdentifier } from '@dfinity/ledger-icp';
import { encodeIcrcAccount, type IcrcAccount } from '@dfinity/ledger-icrc';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const icpAccountIdentifierStore: Readable<AccountIdentifier | undefined> = derived(
	authStore,
	({ identity }) =>
		nonNullish(identity) ? getAccountIdentifier(identity.getPrincipal()) : undefined
);

export const icrcAccountStore: Readable<IcrcAccount | undefined> = derived(
	authStore,
	({ identity }) => (nonNullish(identity) ? { owner: identity.getPrincipal() } : undefined)
);

export const icAccountIdentifierStore: Readable<string | undefined> = derived(
	[tokenStandard, icpAccountIdentifierStore, icrcAccountStore],
	([$tokenStandard, $icpAccountIdentifierStore, $icrcAccountStore]) =>
		$tokenStandard === 'icrc'
			? nonNullish($icrcAccountStore)
				? encodeIcrcAccount($icrcAccountStore)
				: undefined
			: $icpAccountIdentifierStore?.toHex()
);
