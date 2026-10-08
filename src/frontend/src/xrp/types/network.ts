import type { Network } from '$lib/types/network';
import { XrpNetworkSchema } from '$xrp/schema/network.schema';
import type * as z from 'zod';

export type XrpNetworkType = z.infer<typeof XrpNetworkSchema>;

export type XrpNetwork = Network;

export const XrpNetworks = XrpNetworkSchema.enum;
