import * as z from 'zod';

export const HarvestVaultSchema = z.object({
	id: z.string(),
	vaultAddress: z.string(),
	estimatedApy: z.string().nullish()
});

export const HarvestVaultsResponseSchema = z.record(
	z.enum(['arbitrum', 'base', 'eth']),
	z.record(z.string(), HarvestVaultSchema)
);

export type HarvestVault = z.infer<typeof HarvestVaultSchema>;
export type HarvestVaultsResponse = z.infer<typeof HarvestVaultsResponseSchema>;
