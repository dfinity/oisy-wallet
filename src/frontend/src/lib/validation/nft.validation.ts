import { NftIdSchema } from '$lib/schema/nft.schema';
import type { NftId } from '$lib/types/nft';
import * as z from 'zod/v4';

export const parseNftId = (nftIdNumber: z.infer<typeof NftIdSchema>): NftId => {
	const validNumber = NftIdSchema.parse(nftIdNumber);
	return NftIdSchema.parse(Number(validNumber));
};
