import { isNullish, nonNullish } from '@dfinity/utils';
import {
	AuthClient,
	type AuthClientCreateOptions,
	IdbStorage,
	KEY_STORAGE_DELEGATION,
	KEY_STORAGE_KEY
} from '@icp-sdk/auth/client';
import type { Identity } from '@icp-sdk/core/agent';

type SignInAuthClientOptions = Pick<
	AuthClientCreateOptions,
	'identityProvider' | 'windowOpenerFeatures' | 'derivationOrigin'
>;

export class AuthClientProvider {
	static #instance: AuthClientProvider;

	// We use a dedicated storage for the auth client to better manage it, e.g. clear it for a new login
	readonly #storage: IdbStorage;

	#authClient: AuthClient | undefined;

	private constructor() {
		this.#storage = new IdbStorage();
	}

	static getInstance(): AuthClientProvider {
		if (isNullish(this.#instance)) {
			this.#instance = new AuthClientProvider();
		}

		return this.#instance;
	}

	// `@icp-sdk/auth` v6 replaced the async `AuthClient.create` with a synchronous constructor,
	// which we rely on in the sign-in flow: the client must be built inside
	// the user-gesture call stack so popup blockers (e.g. Safari) don't kick in.
	#buildAuthClient = (signInOptions?: SignInAuthClientOptions): AuthClient =>
		new AuthClient({
			storage: this.#storage,
			idleOptions: {
				disableIdle: true,
				disableDefaultIdleCallback: true
			},
			...signInOptions
		});

	// Kept async even though `new AuthClient(...)` is synchronous so the shape
	// matches `safeCreateAuthClient` (which is genuinely async) and so all
	// callers uniformly `await` the result.
	// eslint-disable-next-line require-await
	createAuthClient = async ({
		forceRecreate
	}: { forceRecreate?: boolean } = {}): Promise<AuthClient> => {
		const authClient = this.#authClient;

		if (!forceRecreate && nonNullish(authClient)) {
			return authClient;
		}

		this.#authClient = this.#buildAuthClient();

		return this.#authClient;
	};

	/**
	 * Since icp-js-core persists identity keys in IndexedDB by default,
	 * they could be tampered with and affect the next login.
	 * To ensure each session starts clean and safe, we clear the stored keys
	 * before creating a new AuthClient.
	 *
	 * We also remove the delegation because constructing a new `AuthClient`
	 * does not overwrite or discard an existing delegation — it reads it from
	 * storage and pairs it with whatever key is present. Once the key is
	 * cleared and a fresh one generated, the old delegation would reference a
	 * different public key, producing an ECDSA P256 signature / delegation mismatch.
	 */
	safeCreateAuthClient = async (): Promise<AuthClient> => {
		await Promise.all([
			this.#storage.remove(KEY_STORAGE_KEY),
			this.#storage.remove(KEY_STORAGE_DELEGATION)
		]);

		return await this.createAuthClient({ forceRecreate: true });
	};

	/**
	 * Synchronously creates a fresh `AuthClient` tailored to a sign-in attempt.
	 *
	 * In `@icp-sdk/auth` v6, `identityProvider`, `windowOpenerFeatures` and `derivationOrigin`
	 * are constructor-bound (they used to be passed to `login()`), so a new client
	 * is required per sign-in. Construction stays synchronous so this can be
	 * called from a user-gesture handler without triggering popup blockers.
	 *
	 * The new client replaces the cached one so subsequent calls via
	 * `createAuthClient` return the same instance.
	 */
	createAuthClientForSignIn = (signInOptions: SignInAuthClientOptions): AuthClient => {
		this.#authClient = this.#buildAuthClient(signInOptions);

		return this.#authClient;
	};

	/**
	 * In certain features, we want to execute jobs with the authenticated identity without getting it from the auth.store.
	 * This is notably useful for Web Workers who do not have access to the window.
	 */
	loadIdentity = async (): Promise<Identity | undefined> => {
		const authClient = await this.createAuthClient();

		// Not authenticated, therefore, we provide no identity as a result
		if (!authClient.isAuthenticated()) {
			return undefined;
		}

		return await authClient.getIdentity();
	};

	get storage(): IdbStorage {
		return this.#storage;
	}

	/**
	 * Reset the internal state of the provider.
	 * This is notably useful for testing purposes to ensure that each test starts with a clean state.
	 */
	reset() {
		this.#authClient = undefined;
	}
}
