export type DApp = {
	name: string,
	description: string,
	tags: string[],
	categories: string[],
	imageUrl: string
	channels?: {
		github?: string;
		twitter?: string;
	};
}

export const ALL_DAPPS_CATEGORY = 'All dApps'