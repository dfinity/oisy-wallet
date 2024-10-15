// see https://github.com/dfinity/portal/tree/95c67a5cfe201e4e5cb79f3cf5d18fe16498cd8c?tab=readme-ov-file#object-schema
export interface DApp {
	id: string;
	name: string;
	oneLiner: string;
	website: string;

	tags: string[];
	description: string;
	stats: string;
	logo: string;

	usesInternetIdentity: boolean;
	authOrigins?: string[];

	github?: string;
	youtube?: string;
	twitter?: string;

	screenshots?: string[];

	video?: string;
	videoContentType?: 'video/webm' | 'video/mp4';

	submittableId?: string;
}
