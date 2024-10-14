export type DApp = {
	name: string,
	description: string,
	tags: string[],
	categories: string[],
	imageUrl: string
	channels?: {
		github?: string;
	};
}