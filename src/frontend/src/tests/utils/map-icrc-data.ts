import type { EnvAdditionalIcrcTokens } from '$env/types/env-icrc-additional-token';
import type { EnvTokenSymbol } from '$env/types/env-token-common';
import type { IcInterface } from '$icp/types/ic-token';
import { LOCAL } from '$lib/constants/app.constants';
import { nonNullish } from '@dfinity/utils';

/**
 * Additional ICRC tokens from JSON file
 */
export const mapLocalIcrcData = (
	icrcTokens: EnvAdditionalIcrcTokens
): Record<EnvTokenSymbol, Omit<IcInterface, 'position'>> =>
	Object.entries(icrcTokens).reduce(
		(acc, [key, value]) => ({
			...acc,
			...(LOCAL &&
				nonNullish(value) && {
					[key]: value
				})
		}),
		{}
	);
