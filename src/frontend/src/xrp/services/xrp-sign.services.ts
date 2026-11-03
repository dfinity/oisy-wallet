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

	// The account is derivable from the key, so this pair is checkable without asking anything: it
	// proves the key and `account` agree, and catches a caller asking to send from an account this
	// key cannot sign for, plus the derivation-path mistake described above — which is decided in
	// this file and nowhere else.
	//
	// It does NOT prove the key matches what the signer canister signs with. Under
	// `FRONTEND_DERIVATION_ENABLED` both sides of this comparison come from the same local
	// derivation, since `account` reaches the caller from the address store that `getXrpPublicKey`
	// filled. Establishing that agreement per send would mean `getSchnorrPublicKey`, the certified
	// update call this function exists to remove. The residual is a `deriveTokenAddress` property
	// shared with Solana rather than anything XRP-specific: `XRP_KEY_ID.name` and the master key
	// are both `SIGNER_ROOT_KEY_NAME`, so they cannot diverge by configuration, and the one
	// remaining vector — a wrong hardcoded master public key — is a constant every network shares,
	// so it makes every address in the app wrong and the account shows no balance long before a
	// send is attempted.
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
