import { NEAR_INTENTS_TOS_SHA256 } from '$env/rest/near-intents.env';
import { updateProviderAgreements } from '$lib/api/backend.api';
import { NANO_SECONDS_IN_MILLISECOND } from '$lib/constants/app.constants';
import type { SaveProviderAgreements } from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { NullishIdentity } from '$lib/types/identity';
import { emit } from '$lib/utils/events.utils';
import { assertNonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';

export const acceptProviderAgreement = async ({
	identity,
	currentUserVersion
}: {
	identity: NullishIdentity;
	currentUserVersion: CanisterApiFunctionParams<SaveProviderAgreements>['currentUserVersion'];
}): Promise<void> => {
	assertNonNullish(identity);

	await updateProviderAgreements({
		identity,
		providerAgreements: {
			'NearIntents-Swap': {
				accepted: true,
				lastAcceptedTimestamp: nowInBigIntNanoSeconds(),
				lastUpdatedTimestamp: nowInBigIntNanoSeconds() / NANO_SECONDS_IN_MILLISECOND,
				textSha256: NEAR_INTENTS_TOS_SHA256
			}
		},
		currentUserVersion
	});

	emit({ message: 'oisyRefreshUserProfile' });
};
