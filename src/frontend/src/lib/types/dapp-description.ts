import { UrlSchema } from '$lib/validation/url.validation';
import * as z from 'zod/v4';

// see https://github.com/dfinity/portal/tree/95c67a5cfe201e4e5cb79f3cf5d18fe16498cd8c?tab=readme-ov-file#object-schema
const DAppDescriptionSchema = z.object({
	id: z.string(),
	name: z.string(),
	// TODO replicate logic from https://github.com/dfinity/portal/blob/34a0328ed4792f5a7f3943be73f13f5abaefb4b8/plugins/validate-showcase.js#L179
	oneLiner: z.string(),
	website: UrlSchema,

	tags: z.array(z.string()),
	description: z.string(),
	stats: z.string(),
	logo: z.string(),

	usesInternetIdentity: z.boolean(),
	authOrigins: z.array(z.string()).optional(),

	github: UrlSchema.optional(),
	youtube: UrlSchema.optional(),
	twitter: UrlSchema.optional(),

	screenshots: z.array(z.string()).optional(),

	video: z.string().optional(),
	videoContentType: z.enum(['video/webm', 'video/mp4']).optional(),

	submittableId: z.string().optional()
});

const CarouselDappDescriptionSchema = z.object({
	// TODO: check if text is not too long using logic from https://github.com/dfinity/portal/blob/34a0328ed4792f5a7f3943be73f13f5abaefb4b8/plugins/validate-showcase.js#L179
	text: z.string(),
	callToAction: z.string()
});

export const OisyDappDescriptionSchema = DAppDescriptionSchema.extend({
	featured: z.boolean().optional(),
	callToAction: z.string().optional(),
	telegram: UrlSchema.optional(),
	openChat: UrlSchema.optional(),
	carousel: CarouselDappDescriptionSchema.optional()
});

export type OisyDappDescription = z.infer<typeof OisyDappDescriptionSchema>;
export type FeaturedOisyDappDescription = Omit<OisyDappDescription, 'screenshots'> &
	Required<Pick<OisyDappDescription, 'screenshots'>>;
export type CarouselSlideOisyDappDescription = Omit<OisyDappDescription, 'carousel'> &
	Required<Pick<OisyDappDescription, 'carousel'>>;
