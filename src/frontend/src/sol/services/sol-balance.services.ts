import { SOLANA_KEY_ID } from '$env/networks/networks.sol.env';
import { getSchnorrPublicKey } from '$lib/api/signer.api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';

export const getSolanaPublicKey = async (
	params: CanisterApiFunctionParams<{ derivationPath: string[] }>
): Promise<Uint8Array | number[]> =>
	await getSchnorrPublicKey({
		...params,
		keyId: SOLANA_KEY_ID
	});
