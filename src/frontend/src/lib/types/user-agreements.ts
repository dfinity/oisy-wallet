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
