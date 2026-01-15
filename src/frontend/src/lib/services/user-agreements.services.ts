import { agreementsData } from '$env/agreements.env';
import type { EnvAgreements } from '$env/types/env-agreements';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { updateUserAgreements } from '$lib/api/backend.api';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { SaveUserAgreements } from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { AgreementsToAccept, UserAgreements } from '$lib/types/user-agreements';
import { emit } from '$lib/utils/events.utils';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const acceptAgreements = async ({
	identity,
	agreementsToAccept,
	currentUserVersion
}: {
	identity: OptionIdentity;
	agreementsToAccept: AgreementsToAccept;
	currentUserVersion: CanisterApiFunctionParams<SaveUserAgreements>['currentUserVersion'];
}) => {
	if (isNullish(identity)) {
		return;
	}

	const agreements: UserAgreements = Object.entries(agreementsToAccept).reduce<UserAgreements>(
		(acc, [agreement, accepted]) => {
			if (accepted) {
				return {
					...acc,
					[agreement]: {
						accepted,
						lastAcceptedTimestamp: nowInBigIntNanoSeconds(),
						lastUpdatedTimestamp:
							agreementsData[agreement as keyof EnvAgreements].lastUpdatedTimestamp,
						textSha256: agreementsData[agreement as keyof EnvAgreements].textSha256
					}
				};
			}
			return acc;
		},
		{} as UserAgreements
	);

	if (Object.keys(agreements).length === 0) {
		return;
	}

	try {
		await updateUserAgreements({
			identity,
			agreements,
			currentUserVersion
		});

		emit({ message: 'oisyRefreshUserProfile' });
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).agreements.error.cannot_update_user_agreements },
			err
		});
	}
};
