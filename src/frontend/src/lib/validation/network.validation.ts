import { NetworkIdSchema } from '$lib/schema/network.schema';
import type { NetworkId } from '$lib/types/network';
import * as z from 'zod/v4';

const NetworkIdStringSchema = z.string();

export const parseNetworkId = (
	networkIdString: z.infer<typeof NetworkIdStringSchema>
): NetworkId => {
	const validString = NetworkIdStringSchema.parse(networkIdString);
	return NetworkIdSchema.parse(Symbol(validString));
};
