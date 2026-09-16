import { XRP_KEY_ID } from '$env/networks/networks.xrp.env';
import { getSchnorrPublicKey, signWithSchnorr } from '$lib/api/signer.api';
import type { NullishIdentity } from '$lib/types/identity';
import { XRP_DERIVATION_PATH_PREFIX } from '$xrp/constants/xrp.constants';
import type { XrpNetworkType } from '$xrp/types/network';
import type { XrpPayment } from '$xrp/types/xrp-transaction';
import { encode, encodeForSigning } from 'ripple-binary-codec';

// XRPL Ed25519 canonical public keys are the 32-byte key prefixed with 0xED.
const XRP_ED25519_PREFIX_HEX = 'ED';

const xrpDerivationPath = (network: XrpNetworkType): string[] => [
	XRP_DERIVATION_PATH_PREFIX,
	network
];

/**
 * The canonical Ed25519 public key (uppercase hex, `ED`-prefixed) that XRPL uses as
 * a transaction's `SigningPubKey`. Derived from the same signer key/path as the
 * account address, so the signature it produces verifies against this account.
 */
export const getXrpSigningPublicKey = async ({
	identity,
	network
}: {
	identity: NullishIdentity;
	network: XrpNetworkType;
}): Promise<string> => {
	const publicKey = await getSchnorrPublicKey({
		identity,
		keyId: XRP_KEY_ID,
		derivationPath: xrpDerivationPath(network)
	});

	return `${XRP_ED25519_PREFIX_HEX}${Buffer.from(publicKey).toString('hex').toUpperCase()}`;
};

/**
 * Signs an unsigned XRPL Payment and returns the signed `tx_blob` ready for `submit`.
 *
 * `encodeForSigning` produces the bytes to sign, already prefixed with XRPL's
 * single-signing hash prefix (`STX`, 0x53545800). Ed25519 hashes the message
 * internally, so the raw bytes are handed straight to the threshold signer; the
 * 64-byte signature becomes the `TxnSignature` and the transaction is re-encoded.
 */
export const signXrpTransaction = async ({
	identity,
	network,
	transaction
}: {
	identity: NullishIdentity;
	network: XrpNetworkType;
	transaction: XrpPayment;
}): Promise<string> => {
	const message = Uint8Array.from(Buffer.from(encodeForSigning(transaction), 'hex'));

	const signature = await signWithSchnorr({
		identity,
		derivationPath: xrpDerivationPath(network),
		keyId: XRP_KEY_ID,
		message
	});

	const txnSignature = Buffer.from(signature).toString('hex').toUpperCase();

	return encode({ ...transaction, TxnSignature: txnSignature });
};
