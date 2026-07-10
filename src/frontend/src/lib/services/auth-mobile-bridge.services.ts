import { INTERNET_IDENTITY_CANISTER_ID } from '$lib/constants/app.constants';
import { MOBILE_AUTH_MAX_TIME_TO_LIVE } from '$lib/constants/mobile-auth.constants';
import { InternetIdentityDomain } from '$lib/types/auth';
import { getOptionalDerivationOrigin } from '$lib/utils/auth.utils';
import { hexStringToUint8Array, nonNullish } from '@dfinity/utils';
import { AuthClient, KEY_STORAGE_DELEGATION, type AuthClientStorage } from '@icp-sdk/auth/client';
import { Ed25519PublicKey, PartialIdentity } from '@icp-sdk/core/identity';

// The bridge signs in on behalf of the mobile app's session key. It must never
// touch the browser's persisted web session (IndexedDB), otherwise a user who
// also uses the web wallet in the same browser would get their session paired
// with a key they don't hold. Everything stays in memory and dies with the tab.
class InMemoryAuthClientStorage implements AuthClientStorage {
	#store = new Map<string, string | CryptoKeyPair>();

	// eslint-disable-next-line require-await
	async get(key: string): Promise<string | CryptoKeyPair | null> {
		return this.#store.get(key) ?? null;
	}

	// eslint-disable-next-line require-await
	async set(key: string, value: string | CryptoKeyPair): Promise<void> {
		this.#store.set(key, value);
	}

	// eslint-disable-next-line require-await
	async remove(key: string): Promise<void> {
		this.#store.delete(key);
	}
}

// Same provider resolution as `authStore.signIn` minus the OpenID and popup
// sizing concerns (the bridge always runs as a full tab in the system
// browser). Kept local to the POC — extracting a shared helper from
// `auth.store.ts` is deliberately out of scope, see the spec.
const identityProviderUrl = (): string =>
	nonNullish(INTERNET_IDENTITY_CANISTER_ID)
		? /apple/i.test(navigator?.vendor)
			? `http://localhost:4943/authorize?canisterId=${INTERNET_IDENTITY_CANISTER_ID}`
			: `http://${INTERNET_IDENTITY_CANISTER_ID}.localhost:4943/authorize`
		: `https://${InternetIdentityDomain.VERSION_1_0}/authorize`;

/**
 * Runs the Internet Identity sign-in for a session public key owned by the
 * mobile app and returns the resulting delegation chain as JSON.
 *
 * Because this code executes on the canonical web origin, the delegation is
 * derived exactly as for a web sign-in — same anchor, same principal, same
 * wallet. The session key never exists here: only its public part, wrapped in
 * a `PartialIdentity`.
 */
export const signInMobileAuthBridge = async ({
	sessionPublicKeyDerHex
}: {
	sessionPublicKeyDerHex: string;
}): Promise<{ delegationChainJson: string }> => {
	const sessionPublicKey = Ed25519PublicKey.fromDer(hexStringToUint8Array(sessionPublicKeyDerHex));

	const storage = new InMemoryAuthClientStorage();

	const client = new AuthClient({
		storage,
		identity: new PartialIdentity(sessionPublicKey),
		identityProvider: identityProviderUrl(),
		idleOptions: {
			disableIdle: true,
			disableDefaultIdleCallback: true
		},
		...getOptionalDerivationOrigin()
	});

	await client.signIn({ maxTimeToLive: MOBILE_AUTH_MAX_TIME_TO_LIVE });

	const delegationChainJson = await storage.get(KEY_STORAGE_DELEGATION);

	if (typeof delegationChainJson !== 'string') {
		throw new Error('Mobile auth bridge: no delegation chain was persisted after sign-in.');
	}

	return { delegationChainJson };
};
