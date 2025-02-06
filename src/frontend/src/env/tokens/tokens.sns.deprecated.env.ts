import type { EnvIcrcTokenMetadataWithIcon } from '$env/types/env-icrc-token';
import type { CanisterIdText } from '$lib/types/canister';

export const DEPRECATED_SNES: Record<CanisterIdText, Partial<EnvIcrcTokenMetadataWithIcon>> = {
	['ibahq-taaaa-aaaaq-aadna-cai']: {
		name: '---- (formerly CYCLES-TRANSFER-STATION)',
		symbol: '--- (CTS)',
		alternativeName: undefined,
		url: undefined,
		icon: undefined
	}
};
