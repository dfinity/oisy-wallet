// Imported only by VITE_MOBILE_UI_TEST builds. The WebKit harness blocks network
// responses; these are the same store inputs used by frontend component tests.
import type { UserAgreement } from '$declarations/backend/backend.did';
import { agreementsData } from '$env/agreements.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { EnvAgreements } from '$env/types/env-agreements';
import { authIdentity } from '$lib/derived/auth.derived';
import { nativeTokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { initialLoading } from '$lib/stores/loader.store';
import { modalStore } from '$lib/stores/modal.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

const accepted = (agreement: EnvAgreements['termsOfUse']): UserAgreement => ({
	accepted: toNullable(true),
	last_accepted_at_ns: toNullable(agreement.lastUpdatedTimestamp * BigInt(1_000_000)),
	last_updated_at_ms: toNullable(agreement.lastUpdatedTimestamp),
	text_sha256: toNullable(agreement.textSha256)
});

export const installNavigationFixture = (): (() => void) => {
	const seed = () => {
		if (!get(authIdentity)) {
			return;
		}
		userProfileStore.set({
			certified: true,
			profile: {
				...mockUserProfile,
				agreements: toNullable({
					agreements: {
						terms_of_use: accepted(agreementsData.termsOfUse),
						privacy_policy: accepted(agreementsData.privacyPolicy),
						license_agreement: accepted(agreementsData.licenseAgreement)
					},
					provider_agreements: []
				})
			}
		});
		for (const token of get(nativeTokens)) {
			balancesStore.set({
				id: token.id,
				data: { data: BigInt(10) ** BigInt(token.decimals), certified: true }
			});
		}
		initialLoading.set(false);
	};
	const showTransaction = () => {
		if (get(authIdentity)) {
			modalStore.openIcTransaction({
				id: Symbol(),
				data: {
					token: ICP_TOKEN,
					transaction: { ...createCertifiedIcTransactionUiMock('100').data, status: 'executed' }
				}
			});
		}
	};
	window.addEventListener('oisyTestNavigation', seed);
	window.addEventListener('oisyTestTransaction', showTransaction);
	document.documentElement.dataset.mobileNavigationFixture = 'ready';
	return () => {
		window.removeEventListener('oisyTestNavigation', seed);
		window.removeEventListener('oisyTestTransaction', showTransaction);
		delete document.documentElement.dataset.mobileNavigationFixture;
	};
};
