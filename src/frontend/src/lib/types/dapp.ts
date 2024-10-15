export interface DApp {
	name: string;
	featured?: boolean;
	oneLiner: string;
	description: string;
	categories: string[];
	logoUrl: string;
	imageUrl?: string;
	url: string;
	channels?: {
		github?: string;
		twitter?: string;
	};
}
