import { CustomTokenSection } from '$lib/enums/custom-token-section';
import * as z from 'zod';

export const NonFungibleTokenAppearanceSchema = z.object({
	section: z.enum(CustomTokenSection).optional(),
	allowExternalContentSource: z.boolean().optional()
});
