import { userAgreementsData } from '$lib/derived/user-profile.derived';
import type { UserProviderAgreements } from '$lib/types/user-provider-agreements';
import { mapProviderAgreements } from '$lib/utils/provider-agreements.utils';
import { fromNullable, isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const userProviderAgreements: Readable<UserProviderAgreements> = derived(
	[userAgreementsData],
	([$userAgreementsData]) => {
		const backendProviderAgreements = fromNullable($userAgreementsData?.provider_agreements ?? []);

		if (isNullish(backendProviderAgreements)) {
			return {};
		}

		return mapProviderAgreements(backendProviderAgreements);
	}
);

export const hasAcknowledgedNearIntentsSwap: Readable<boolean> = derived(
	[userProviderAgreements],
	([$userProviderAgreements]) => $userProviderAgreements['NearIntents-Swap']?.accepted === true
);
