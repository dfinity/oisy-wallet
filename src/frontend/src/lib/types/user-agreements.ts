import type { EnvAgreements } from '$env/types/env-agreements';

export interface AgreementData {
	accepted: boolean | undefined;
	lastAcceptedTimestamp: bigint | undefined;
	lastUpdatedTimestamp: bigint | undefined;
}

export interface UserAgreements {
	licenseAgreement: AgreementData;
	privacyPolicy: AgreementData;
	termsOfUse: AgreementData;
}

export type AgreementsToAccept = {
	[K in keyof EnvAgreements]?: boolean;
};
