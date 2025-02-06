import type { EnvIcrcTokenMetadataWithIcon } from '$env/types/env-icrc-token';
import type { LedgerCanisterIdText } from '$icp/types/canister';

export const DEPRECATED_SNES: Record<
	LedgerCanisterIdText,
	Partial<EnvIcrcTokenMetadataWithIcon>
> = {
	['ibahq-taaaa-aaaaq-aadna-cai']: {
		name: '---- (formerly CYCLES-TRANSFER-STATION)',
		symbol: '--- (CTS)',
		alternativeName: undefined,
		url: undefined,
		icon: undefined
	}
};
