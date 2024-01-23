import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { tokenStandard } from '$lib/derived/token.derived';
import { authStore } from '$lib/stores/auth.store';
import type { AccountIdentifier } from '@dfinity/ledger-icp';
import { encodeIcrcAccount, type IcrcAccount } from '@dfinity/ledger-icrc';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const icpAccountIdentifierStore: Readable<AccountIdentifier | undefined> = derived(
	authStore,
	({ identity }) =>
		nonNullish(identity) ? getAccountIdentifier(identity.getPrincipal()) : undefined
);

export const icpAccountIdentifierTextStore: Readable<string | undefined> = derived(
	icpAccountIdentifierStore,
	($icpAccountIdentifierStore) => $icpAccountIdentifierStore?.toHex()
);

export const icrcAccountStore: Readable<IcrcAccount | undefined> = derived(
	authStore,
	({ identity }) => (nonNullish(identity) ? getIcrcAccount(identity.getPrincipal()) : undefined)
);

export const icrcAccountIdentifierStore: Readable<string | undefined> = derived(
	icrcAccountStore,
	($icrcAccountStore) =>
		nonNullish($icrcAccountStore) ? encodeIcrcAccount($icrcAccountStore) : undefined
);

export const icAccountIdentifierStore: Readable<string | undefined> = derived(
	[tokenStandard, icpAccountIdentifierStore, icrcAccountIdentifierStore],
	([$tokenStandard, $icpAccountIdentifierStore, $icrcAccountIdentifierStore]) =>
		$tokenStandard === 'icrc' ? $icrcAccountIdentifierStore : $icpAccountIdentifierStore?.toHex()
);
