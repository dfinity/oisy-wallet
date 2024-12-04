import { z } from 'zod';
import type { SolNetworkSchema } from '../schema/network.schema';

export type SolNetwork = z.infer<typeof SolNetworkSchema>;
