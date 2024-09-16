import { z } from 'zod';

export const envTokenSymbol = z.string();

export type EnvTokenSymbol = z.infer<typeof envTokenSymbol>;
