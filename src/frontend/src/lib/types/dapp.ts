export type DApp = {
	name: string,
	description: string,
	tags: string[],
	imageUrl?: string
	channels?: {
		github?: string;
	};
}