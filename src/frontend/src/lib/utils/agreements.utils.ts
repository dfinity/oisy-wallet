import type {
	UserAgreement as BackendUserAgreement,
	UserAgreements as BackendUserAgreements
} from '$declarations/backend/backend.did';
import { agreementsData } from '$env/agreements.env';
import type { EnvAgreements } from '$env/types/env-agreements';
import LicenseAgreement from '$lib/components/license-agreement/LicenseAgreement.svelte';
import PrivacyPolicy from '$lib/components/privacy-policy/PrivacyPolicy.svelte';
import TermsOfUse from '$lib/components/terms-of-use/TermsOfUse.svelte';
import { MILLISECONDS_IN_SECOND } from '$lib/constants/app.constants';
import type { Languages } from '$lib/enums/languages';
import type { AgreementData, AgreementsToAccept, UserAgreements } from '$lib/types/user-agreements';
import { componentToHtml } from '$lib/utils/component.utils';
import { formatSecondsToDate } from '$lib/utils/format.utils';
import { fromNullable, nonNullish, toNullable } from '@dfinity/utils';
import type { Component, ComponentProps } from 'svelte';

export const getAgreementLastUpdated = ({
	type,
	$i18n
}: {
	type: keyof EnvAgreements;
	$i18n: I18n;
}): string =>
	formatSecondsToDate({
		seconds: Number(agreementsData[type]?.lastUpdatedTimestamp / BigInt(MILLISECONDS_IN_SECOND)),
		language: $i18n.lang,
		formatOptions: {
			minute: undefined,
			hour: undefined
		}
	});

export const mapUserAgreement = (backendUserAgreement: BackendUserAgreement): AgreementData => ({
	accepted: fromNullable(backendUserAgreement.accepted),
	lastAcceptedTimestamp: fromNullable(backendUserAgreement.last_accepted_at_ns),
	lastUpdatedTimestamp: fromNullable(backendUserAgreement.last_updated_at_ms)
});

const mapBackendUserAgreement = (userAgreement: AgreementData | undefined): BackendUserAgreement =>
	nonNullish(userAgreement)
		? {
				accepted: toNullable(userAgreement.accepted),
				last_accepted_at_ns: toNullable(userAgreement.lastAcceptedTimestamp),
				last_updated_at_ms: toNullable(userAgreement.lastUpdatedTimestamp)
			}
		: {
				accepted: toNullable(),
				last_accepted_at_ns: toNullable(),
				last_updated_at_ms: toNullable()
			};

export const mapBackendUserAgreements = (
	agreements: Partial<UserAgreements>
): BackendUserAgreements => ({
	license_agreement: mapBackendUserAgreement(agreements.licenseAgreement),
	privacy_policy: mapBackendUserAgreement(agreements.privacyPolicy),
	terms_of_use: mapBackendUserAgreement(agreements.termsOfUse)
});

const renderAgreementItemHtml = <T extends Component>({
	agreementType: k,
	i18n,
	...rest
}: {
	agreementType: keyof BackendUserAgreements;
	i18n: I18n;
	Component: T;
	props?: ComponentProps<T>;
}): string => {
	const det = i18n[k].text.det.possessive;
	const link = componentToHtml(rest);
	return `${det}${link}`;
};

const mapAgreementToComponent = (
	agreementType: keyof BackendUserAgreements
): typeof LicenseAgreement | typeof TermsOfUse | typeof PrivacyPolicy => {
	if (agreementType === 'license_agreement') {
		return LicenseAgreement;
	}

	if (agreementType === 'terms_of_use') {
		return TermsOfUse;
	}

	if (agreementType === 'privacy_policy') {
		return PrivacyPolicy;
	}

	// Force compiler error on unhandled cases based on leftover types
	const _: never = agreementType;

	throw new Error(`Unmapped agreement type: ${agreementType}`);
};

export const formatUpdatedAgreementsHtml = ({
	agreements,
	i18n,
	language
}: {
	agreements: AgreementsToAccept;
	i18n: I18n;
	language: Languages;
}): string => {
	if (Object.keys(agreements).length === 0) {
		return '';
	}

	const parts = Object.keys(agreements).map((agreementType) =>
		renderAgreementItemHtml({
			agreementType: agreementType as keyof BackendUserAgreements,
			i18n,
			Component: mapAgreementToComponent(agreementType as keyof BackendUserAgreements)
		})
	);

	return new Intl.ListFormat(language, { type: 'conjunction', style: 'long' }).format(parts);
};
