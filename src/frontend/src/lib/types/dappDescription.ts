import dAppDescriptionsJson from '$env/dapp-descriptions.json';
import { z } from 'zod';

// see https://github.com/dfinity/portal/tree/95c67a5cfe201e4e5cb79f3cf5d18fe16498cd8c?tab=readme-ov-file#object-schema
export enum DappDescriptionTag {
	DEX = 'DEX',
	SIGNER_STANDARD = 'Signer Standard',
	STAKING = 'Staking',
	VERIFIABLE_CREDENTIALS = 'Verifiable Credentials',
	SOCIAL_MEDIA = 'Social Media',
	WALLET_CONNECT = 'WalletConnect'
}

const dAppDescriptionSchema = z.object({
	id: z.string(),
	name: z.string(),
	// TODO replicate logic from https://github.com/dfinity/portal/blob/34a0328ed4792f5a7f3943be73f13f5abaefb4b8/plugins/validate-showcase.js#L179
	oneLiner: z.string(),
	// TODO validate that this URL starts with HTTPs
	website: z.string().url(),

	tags: z.array(z.nativeEnum(DappDescriptionTag)),
	description: z.string(),
	stats: z.string(),
	logo: z.string(),

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

export type DappDescription = z.infer<typeof dAppDescriptionSchema>;

const parseResult = z.array(dAppDescriptionSchema).safeParse(dAppDescriptionsJson);
export const dAppDescriptions: DappDescription[] = parseResult.success ? parseResult.data : [];
