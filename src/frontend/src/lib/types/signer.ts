import type { SignerMasterPubKeysSchema } from '$lib/schema/signer.schema';
import type * as z from 'zod';

export type SignerMasterPubKeys = z.infer<typeof SignerMasterPubKeysSchema>;
