import { INTERNET_IDENTITY_CANISTER_ID } from '$lib/constants/app.constants';
import { MOBILE_AUTH_MAX_TIME_TO_LIVE } from '$lib/constants/mobile-auth.constants';
import { InternetIdentityDomain, type OpenIdProvider } from '$lib/types/auth';
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

	// The (key, value) signature is mandated by the `AuthClientStorage` interface.
	// eslint-disable-next-line require-await, local-rules/prefer-object-params
	async set(key: string, value: string | CryptoKeyPair): Promise<void> {
		this.#store.set(key, value);
	}

	// eslint-disable-next-line require-await
	async remove(key: string): Promise<void> {
		this.#store.delete(key);
	}
}

// Same provider resolution as `authStore.signIn` minus the popup sizing
// concerns (the bridge always runs as a full tab in the system browser).
// Kept local to the POC — extracting a shared helper from `auth.store.ts`
// is deliberately out of scope, see the spec.
//
// One-Click OpenID sign-in is only supported by Internet Identity 2.0 on
// mainnet (id.ai); the local II replica does not handle the `?openid=…`
// query param, so id.ai is forced for that flow.
const identityProviderUrl = ({ openIdProvider }: { openIdProvider?: OpenIdProvider }): string =>
	nonNullish(openIdProvider)
		? `https://${InternetIdentityDomain.VERSION_2_0}/authorize`
		: nonNullish(INTERNET_IDENTITY_CANISTER_ID)
			? /apple/i.test(globalThis.navigator?.vendor ?? '')
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
	sessionPublicKeyDerHex,
	openIdProvider
}: {
	sessionPublicKeyDerHex: string;
	openIdProvider?: OpenIdProvider;
}): Promise<{ delegationChainJson: string }> => {
	const sessionPublicKey = Ed25519PublicKey.fromDer(hexStringToUint8Array(sessionPublicKeyDerHex));

	const storage = new InMemoryAuthClientStorage();

	const client = new AuthClient({
		storage,
		identity: new PartialIdentity(sessionPublicKey),
		identityProvider: identityProviderUrl({ openIdProvider }),
		idleOptions: {
			disableIdle: true,
			disableDefaultIdleCallback: true
		},
		...(nonNullish(openIdProvider) ? { openIdProvider } : {}),
		...getOptionalDerivationOrigin()
	});

	let signInError: unknown;
	try {
		await client.signIn({ maxTimeToLive: MOBILE_AUTH_MAX_TIME_TO_LIVE });
	} catch (err: unknown) {
		// `@icp-sdk/auth` v6's signIn persists the delegation chain BEFORE the
		// session key, and its key serializer throws "Unsupported key type" for
		// `PartialIdentity` — i.e. it rejects AFTER a fully successful II
		// authentication. The chain is the only thing the bridge needs, so we
		// fall through and read storage; the error only matters if no chain
		// was persisted (a genuinely failed or cancelled sign-in).
		signInError = err;
	}

	const delegationChainJson = await storage.get(KEY_STORAGE_DELEGATION);

	if (typeof delegationChainJson !== 'string') {
		throw signInError ?? new Error('Mobile auth bridge: no delegation chain was persisted.');
	}

	return { delegationChainJson };
};
