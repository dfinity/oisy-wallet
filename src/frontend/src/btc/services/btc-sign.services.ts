import { finalizeSignedBtcPsbt, type SignedBtcTransaction } from '$btc/utils/btc-psbt.utils';
import { deriveBtcPublicKey } from '$btc/utils/wallet-connect.utils';
import { signBtcPrehash } from '$lib/api/signer.api';
import type { Identity } from '@icp-sdk/core/agent';
import { Signature } from '@noble/secp256k1';
import type { Psbt, SignerAsync } from 'bitcoinjs-lib';

/**
 * A bitcoinjs-lib signer for the caller's BTC key. Its public key is derived locally, and each
 * signature comes from the chain fusion signer's `btc_sign_prehash`.
 *
 * Each signature is normalized to low-S (`s > n/2` → `n − s`), defensively: a high-S signature is
 * non-standard, so nodes would not relay a transaction that carries one.
 */
export const createBtcPrehashSigner = ({ identity }: { identity: Identity }): SignerAsync => ({
	publicKey: Buffer.from(deriveBtcPublicKey({ principal: identity.getPrincipal() })),
	sign: async (hash: Buffer): Promise<Buffer> => {
		const rawSignature = await signBtcPrehash({ identity, hash: Uint8Array.from(hash) });

		return Buffer.from(Signature.fromCompact(rawSignature).normalizeS().toCompactRawBytes());
	}
});

/**
 * Signs every input of a send's PSBT with the caller's key, checks the signatures and returns the
 * signed transaction. Its txid is known before anything is broadcast.
 *
 * One `btc_sign_prehash` call per input, all made at once: bitcoinjs-lib computes an input's
 * sighash before calling the signer and only adds that input's signature after the call returns.
 * Throws if an input is not the caller's, or if a signature does not verify.
 */
export const signAndFinalizeBtcPsbt = async ({
	psbt,
	identity
}: {
	psbt: Psbt;
	identity: Identity;
}): Promise<SignedBtcTransaction> => {
	const signer = createBtcPrehashSigner({ identity });

	await Promise.all(psbt.txInputs.map((_, index) => psbt.signInputAsync(index, signer)));

	return finalizeSignedBtcPsbt({ psbt });
};
