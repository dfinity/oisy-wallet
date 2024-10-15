import { z } from 'zod';

// see https://github.com/dfinity/portal/tree/95c67a5cfe201e4e5cb79f3cf5d18fe16498cd8c?tab=readme-ov-file#object-schema
const dAppSchema = z.object({
	id: z.string(),
	name: z.string(),
	oneLiner: z.string(),
	website: z.string().url(),

	tags: z.array(z.string()),
	description: z.string(),
	stats: z.string(),
	logo: z.string().url(),

	usesInternetIdentity: z.boolean(),
	authOrigins: z.array(z.string()).optional(),

	github: z.string().url().optional(),
	youtube: z.string().url().optional(),
	twitter: z.string().url().optional(),

	screenshots: z.array(z.string()).optional(),

	video: z.string().optional(),
	videoContentType: z.enum(['video/webm', 'video/mp4']).optional(),

	submittableId: z.string().optional(),

	featured: z.boolean().optional()
});

export type DApp = z.infer<typeof dAppSchema>;
