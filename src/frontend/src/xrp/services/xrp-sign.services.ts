import { XRP_KEY_ID } from '$env/networks/networks.xrp.env';
import { signWithSchnorr } from '$lib/api/signer.api';
import type { NullishIdentity } from '$lib/types/identity';
import { XRP_DERIVATION_PATH_PREFIX } from '$xrp/constants/xrp.constants';
import { getXrpPublicKey } from '$xrp/services/xrp-address.services';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import type { XrpPayment } from '$xrp/types/xrp-transaction';
import { mapEd25519PublicKeyToClassicAddress } from '$xrp/utils/xrp-address.utils';
import { encode, encodeForSigning } from 'ripple-binary-codec';

// XRPL Ed25519 canonical public keys are the 32-byte key prefixed with 0xED.
const XRP_ED25519_PREFIX_HEX = 'ED';

const xrpDerivationPath = (network: XrpNetworkType): string[] => [
	XRP_DERIVATION_PATH_PREFIX,
	network
];

/**
 * The canonical Ed25519 public key (uppercase hex, `ED`-prefixed) that XRPL uses as
 * a transaction's `SigningPubKey`.
 *
 * Routed through `getXrpPublicKey`, the same derivation the account address uses, so the key is
 * computed locally where the frontend can and the signer canister is the fallback rather than the
 * default. It used to spend a certified update call on every send for a key the app already
 * derives for free, and that call is the slowest leg of the pre-sign work.
 *
 * Note `getXrpPublicKey` prepends `XRP_DERIVATION_PATH_PREFIX` itself, so it takes `[network]`
 * rather than the full path — passing the full one would derive a DIFFERENT key, and the
 * transaction would carry a `SigningPubKey` the signature does not match.
 *
 * `account` is the address the transaction will claim to be from, and the key must belong to it.
 * The check is here rather than at the call site so no caller can omit it.
 */
export const getXrpSigningPublicKey = async ({
	identity,
	network,
	account
}: {
	identity: NullishIdentity;
	network: XrpNetworkType;
	account: XrpAddress;
}): Promise<string> => {
	const publicKey = await getXrpPublicKey({ identity, derivationPath: [network] });

	// This key is derived locally while the signature comes from the signer canister, so the two
	// can disagree — a master public key that is wrong for the environment, or a change to the
	// shared derivation. Nothing would then reject the transaction until XRPL did, on a signature
	// that cannot verify, after the send was submitted. The account is derivable from the key, so
	// the mismatch is knowable here: deriving it makes that a named pre-sign failure, and also
	// catches a caller asking to send from an account this key cannot sign for.
	const derivedAccount = mapEd25519PublicKeyToClassicAddress(publicKey);

	if (derivedAccount !== account) {
		throw new Error(`XRP signing key does not belong to ${account}: it derives ${derivedAccount}.`);
	}

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
