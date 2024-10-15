export interface DApp {
	id: string;
	name: string;
	oneLiner: string;
	website: string;
	tags: string[];
	display: string;
	stats: string;
	twitter: string;
	description: string;
	usesInternetIdentity: boolean;
	logo: string;
	screenshots: string[];
	featured?: boolean;
}
