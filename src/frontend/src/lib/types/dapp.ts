export interface DApp {
	name: string;
	description: string;
	tags: string[];
	categories: string[];
	imageUrl: string;
	channels?: {
		github?: string;
		twitter?: string;
	};
	url: string;
};

export const ALL_DAPPS_CATEGORY = 'All dApps';
