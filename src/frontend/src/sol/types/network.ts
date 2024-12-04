import type { SolNetworkSchema } from '$sol/schema/network.schema';
import { z } from 'zod';

export type SolNetwork = z.infer<typeof SolNetworkSchema>;
