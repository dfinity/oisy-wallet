import { z } from 'zod';

export const AdditionalMenuItemSchema = z.object({
	openModal: z.function().returns(z.void()),
	label: z.string(),
	ariaLabel: z.string()
});

export type AdditionalMenuItem = z.infer<typeof AdditionalMenuItemSchema>;
