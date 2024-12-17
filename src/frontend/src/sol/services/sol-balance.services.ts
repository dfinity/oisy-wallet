import { SOLANA_KEY_ID } from '$env/networks/networks.sol.env';
import { getSchnorrPublicKey } from '$lib/api/signer.api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';

export const getSolanaPublicKey = async (
	params: CanisterApiFunctionParams<{ derivationPath: string[] }>
): Promise<Uint8Array | number[]> =>
	await getSchnorrPublicKey({
		...params,
		keyId: SOLANA_KEY_ID,
		derivationPath: [SOLANA_DERIVATION_PATH_PREFIX, ...params.derivationPath]
	});
