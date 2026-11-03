export enum LendBorrowProvider {
	LIQUIDIUM = 'liquidium'
}

export interface LendBorrowProviderConfig {
	// Brand name (not i18n — identical in every locale).
	name: string;
	// i18n key path (resolved via `resolveText`).
	descriptionKey: string;
	logo: string;
	url: string;
	docsUrl: string;
}
