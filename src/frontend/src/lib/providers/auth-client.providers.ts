import type { Identity } from '@dfinity/agent';
import { AuthClient, IdbStorage, KEY_STORAGE_KEY } from '@dfinity/auth-client';
import { isNullish } from '@dfinity/utils';

export class AuthClientProvider {
	static #instance: AuthClientProvider;

	// We use a dedicated storage for the auth client to better manage it, e.g. clear it for a new login
	readonly #storage: IdbStorage;

	private constructor() {
		this.#storage = new IdbStorage();
	}

	static getInstance(): AuthClientProvider {
		if (isNullish(this.#instance)) {
			this.#instance = new AuthClientProvider();
		}

		return this.#instance;
	}

	createAuthClient = (): Promise<AuthClient> =>
		AuthClient.create({
			storage: this.#storage,
			idleOptions: {
				disableIdle: true,
				disableDefaultIdleCallback: true
			}
		});

	/**
	 * Since icp-js-core persists identity keys in IndexedDB by default,
	 * they could be tampered with and affect the next login.
	 * To ensure each session starts clean and safe, we clear the stored keys before creating a new AuthClient.
	 */
	safeCreateAuthClient = async (): Promise<AuthClient> => {
		await this.#storage.remove(KEY_STORAGE_KEY);
		return await this.createAuthClient();
	};

	/**
	 * In certain features, we want to execute jobs with the authenticated identity without getting it from the auth.store.
	 * This is notably useful for Web Workers who do not have access to the window.
	 */
	loadIdentity = async (): Promise<Identity | undefined> => {
		const authClient = await this.createAuthClient();
		const authenticated = await authClient.isAuthenticated();

		// Not authenticated, therefore, we provide no identity as a result
		if (!authenticated) {
			return undefined;
		}

		return authClient.getIdentity();
	};

	get storage(): IdbStorage {
		return this.#storage;
	}
}
