import borrowProvidersJson from '$env/borrow-providers.json';
import { EarningProviderConfigSchema } from '$env/schema/env-earning-providers.schema';
import type { EarningProviderStaticConfig } from '$lib/types/earning-provider';
import * as z from 'zod';

const parseResult = z.array(EarningProviderConfigSchema).safeParse(borrowProvidersJson);

export const borrowProviderConfigs: EarningProviderStaticConfig[] = parseResult.success
	? parseResult.data
	: [];
