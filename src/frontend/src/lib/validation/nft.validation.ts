import { NftIdSchema } from '$lib/schema/nft.schema';
import type { NftId } from '$lib/types/nft';
import * as z from 'zod';

const NftIdStringSchema = z.string();

export const parseNftId = (nftIdString: z.infer<typeof NftIdStringSchema>): NftId => {
	const validString = NftIdStringSchema.parse(nftIdString);
	return NftIdSchema.parse(validString);
};
