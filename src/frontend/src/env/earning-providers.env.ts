import earningProvidersJson from '$env/earning-providers.json';
import { EarningProviderConfigSchema } from '$env/schema/env-earning-providers.schema';
import type { EarningProviderStaticConfig } from '$lib/types/earning-provider';
import * as z from 'zod';

const parseResult = z.array(EarningProviderConfigSchema).safeParse(earningProvidersJson);

export const earningProviderConfigs: EarningProviderStaticConfig[] = parseResult.success
	? parseResult.data
	: [];
