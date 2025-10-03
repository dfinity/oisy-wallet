import type { EnvAgreements } from '$env/types/env-agreements';

export interface AgreementData {
	accepted: boolean | undefined;
	lastAcceptedTimestamp: bigint | undefined;
	lastUpdatedTimestamp: bigint | undefined;
	textSha256: string | undefined;
}

export interface UserAgreements {
	termsOfUse: AgreementData;
	privacyPolicy: AgreementData;
	licenseAgreement: AgreementData;
}

export type AgreementsToAccept = {
	[K in keyof EnvAgreements]?: boolean;
};
