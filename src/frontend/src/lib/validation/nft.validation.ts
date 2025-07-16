import * as z from 'zod/v4';
import type { NftId } from '$lib/types/nft';
import { NftIdSchema } from '$lib/schema/nft.schema';

const NftIdNumberSchema = z.number();

export const parseNftId = (nftIdNumber: z.infer<typeof NftIdNumberSchema>): NftId => {
	const validNumber = NftIdNumberSchema.parse(nftIdNumber);
	return NftIdSchema.parse(Number(validNumber));
}