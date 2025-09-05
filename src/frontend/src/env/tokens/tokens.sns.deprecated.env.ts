import type { EnvIcrcTokenMetadataWithIcon } from '$env/types/env-icrc-token';
import type { LedgerCanisterIdText } from '$icp/types/canister';

export const DEPRECATED_SNES: Record<
	LedgerCanisterIdText,
	Omit<EnvIcrcTokenMetadataWithIcon, 'decimals' | 'fee'>
> = {
	['itgqj-7qaaa-aaaaq-aadoa-cai']: {
		name: '---- (formerly CYCLES-TRANSFER-STATION)',
		symbol: '--- (CTS)',
		alternativeName: undefined,
		url: undefined,
		icon: undefined
	},
	['rffwt-piaaa-aaaaq-aabqq-cai']: {
		name: '---- (formerly Seers)',
		symbol: '--- (SEER)',
		alternativeName: undefined,
		url: undefined,
		icon: undefined
	}
};
