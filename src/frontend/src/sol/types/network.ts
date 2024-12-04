import { z } from 'zod';
import type { SolNetworkSchema } from '$sol/schema/network.schema';

export type SolNetwork = z.infer<typeof SolNetworkSchema>;
