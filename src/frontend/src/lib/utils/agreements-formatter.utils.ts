/**
 * The functions in this file should have gone in the `agreements.utils.ts` module.
 * However, in their usage there is a circular reference somewhere in the build that makes it fail.
 * I was still unable to find the source of the issue, so I decided to keep them here for now.
 * TODO: investigate the circular reference issue and move these functions to `agreements.utils.ts`
 **/

import type { UserAgreements as BackendUserAgreements } from '$declarations/backend/declarations/backend.did';
import type { EnvAgreements } from '$env/types/env-agreements';
import LicenseAgreementLink from '$lib/components/license-agreement/LicenseAgreementLink.svelte';
import PrivacyPolicyLink from '$lib/components/privacy-policy/PrivacyPolicyLink.svelte';
import TermsOfUseLink from '$lib/components/terms-of-use/TermsOfUseLink.svelte';
import type { AgreementsToAccept } from '$lib/types/user-agreements';
import { componentToHtml } from '$lib/utils/component.utils';
import { assertNever } from '@dfinity/utils';
import type { Component, ComponentProps } from 'svelte';

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

const camelToSnake = (str: keyof EnvAgreements): keyof BackendUserAgreements =>
	str
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2') // insert _ before capital
		.replace(/([A-Z])([A-Z][a-z])/g, '$1_$2') // handle acronym boundaries
		.toLowerCase() as keyof BackendUserAgreements;

const mapAgreementToComponent = (
	agreementType: keyof EnvAgreements
): typeof LicenseAgreementLink | typeof TermsOfUseLink | typeof PrivacyPolicyLink => {
	if (agreementType === 'licenseAgreement') {
		return LicenseAgreementLink;
	}

	if (agreementType === 'termsOfUse') {
		return TermsOfUseLink;
	}

	if (agreementType === 'privacyPolicy') {
		return PrivacyPolicyLink;
	}

	assertNever(agreementType, `Unmapped agreement type: ${agreementType}`);
};

export const formatUpdatedAgreementsHtml = ({
	agreements,
	i18n
}: {
	agreements: AgreementsToAccept;
	i18n: I18n;
}): string => {
	if (Object.keys(agreements).length === 0) {
		return '';
	}

	const parts = Object.keys(agreements).map((agreementType) =>
		renderAgreementItemHtml({
			agreementType: camelToSnake(agreementType as keyof EnvAgreements),
			i18n,
			Component: mapAgreementToComponent(agreementType as keyof EnvAgreements),
			props: { color: 'blue' }
		})
	);

	return new Intl.ListFormat(i18n.lang, { type: 'conjunction', style: 'long' }).format(parts);
};
