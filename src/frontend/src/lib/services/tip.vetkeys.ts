import { getTipEncryptedVetkey, getTipVetkeyPublicKey } from '$lib/api/backend.api';
import { nonNullish } from '@dfinity/utils';
import {
	DerivedPublicKey,
	EncryptedVetKey,
	TransportSecretKey,
	type DerivedKeyMaterial
} from '@dfinity/vetkeys';
import type { Identity } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';

// These MUST match the backend (`tips::secrets::TIP_SECRETS_DOMAIN_SEPARATOR`
// and `TIP_SECRETS_MAP_NAME`). They are bound into the vetKD key derivation, so
// any drift would make every stored claim code permanently undecryptable — and
// with it every sender's ability to recover their own links.
const TIP_SECRETS_MAP_NAME = 'tip_secrets';
const MAP_NAME_BYTE_LENGTH = 32;

const mapNameBytes = (): Uint8Array => {
	const encoded = new TextEncoder().encode(TIP_SECRETS_MAP_NAME);
	if (encoded.length > MAP_NAME_BYTE_LENGTH) {
		throw new Error(`TIP_SECRETS_MAP_NAME exceeds ${MAP_NAME_BYTE_LENGTH} bytes`);
	}
	const bytes = new Uint8Array(MAP_NAME_BYTE_LENGTH);
	bytes.set(encoded);
	return bytes;
};

// Mirrors the backend's key id: a length-prefixed principal followed by the
// 32-byte map name. The verification key already carries the domain separator,
// so it is not repeated here.
const vetkdInput = (principal: Principal): Uint8Array => {
	const principalBytes = principal.toUint8Array();
	const name = mapNameBytes();
	const input = new Uint8Array(1 + principalBytes.length + name.length);
	input[0] = principalBytes.length;
	input.set(principalBytes, 1);
	input.set(name, 1 + principalBytes.length);
	return input;
};

// Per-session, per-principal cache of the derived key material. Held in memory
// only — never persisted — so it is discarded on reload and on sign-out. A
// separate cache from the personal-notes one because it is a different key: the
// two stores derive under different map names on purpose.
const sessionCache = new Map<string, Promise<DerivedKeyMaterial>>();

const toUint8Array = (value: Uint8Array | number[]): Uint8Array =>
	value instanceof Uint8Array ? value : Uint8Array.from(value);

/**
 * Derives the caller's key material for the tip-secrets store via vetKD and
 * caches it for the session. The vetKD call is metered and rate-limited, so the
 * cache matters: recovering several links in one visit derives once.
 */
export const deriveTipKeyMaterial = ({
	identity
}: {
	identity: Identity;
}): Promise<DerivedKeyMaterial> => {
	const principal = identity.getPrincipal();
	const cacheKey = principal.toText();

	const cached = sessionCache.get(cacheKey);
	if (nonNullish(cached)) {
		return cached;
	}

	const promise = (async (): Promise<DerivedKeyMaterial> => {
		const transportSecretKey = TransportSecretKey.random();
		const [encryptedVetkey, verificationKey] = await Promise.all([
			getTipEncryptedVetkey({
				identity,
				transportPublicKey: transportSecretKey.publicKeyBytes()
			}),
			getTipVetkeyPublicKey({ identity })
		]);

		const vetKey = EncryptedVetKey.deserialize(toUint8Array(encryptedVetkey)).decryptAndVerify(
			transportSecretKey,
			DerivedPublicKey.deserialize(toUint8Array(verificationKey)),
			vetkdInput(principal)
		);

		return vetKey.asDerivedKeyMaterial();
	})();

	sessionCache.set(cacheKey, promise);

	// Don't keep a rejected derivation cached — allow the next call to retry.
	return promise.catch((err: unknown) => {
		sessionCache.delete(cacheKey);
		throw err;
	});
};

// The tip id is the AES-GCM domain separator, binding each ciphertext to its own
// tip. Without it a ciphertext lifted from one entry would decrypt under
// another. The *WithKey helpers are exported for tests that inject a known key
// and skip the vetKD round-trip.

export const encryptClaimCodeWithKey = ({
	keyMaterial,
	claimCode,
	tipId
}: {
	keyMaterial: DerivedKeyMaterial;
	claimCode: string;
	tipId: string;
}): Promise<Uint8Array> => keyMaterial.encryptMessage(claimCode, tipId);

export const decryptClaimCodeWithKey = async ({
	keyMaterial,
	encrypted,
	tipId
}: {
	keyMaterial: DerivedKeyMaterial;
	encrypted: Uint8Array;
	tipId: string;
}): Promise<string> => {
	const bytes = await keyMaterial.decryptMessage(encrypted, tipId);
	return new TextDecoder().decode(bytes);
};

export const encryptClaimCode = async ({
	claimCode,
	tipId,
	identity
}: {
	claimCode: string;
	tipId: string;
	identity: Identity;
}): Promise<Uint8Array> => {
	const keyMaterial = await deriveTipKeyMaterial({ identity });
	return encryptClaimCodeWithKey({ keyMaterial, claimCode, tipId });
};

export const decryptClaimCode = async ({
	encrypted,
	tipId,
	identity
}: {
	encrypted: Uint8Array;
	tipId: string;
	identity: Identity;
}): Promise<string> => {
	const keyMaterial = await deriveTipKeyMaterial({ identity });
	return decryptClaimCodeWithKey({ keyMaterial, encrypted, tipId });
};

/** Clears the in-memory key cache (e.g. on sign-out). */
export const resetTipKeyCache = (): void => sessionCache.clear();
