import { MOBILE_AUTH_CALLBACK_URI } from '$lib/constants/mobile-auth.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { initMobileAuthListener, signInMobile } from '$lib/services/auth-mobile.services';
import { authStore } from '$lib/stores/auth.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { buildMobileAuthCallbackUrl } from '$lib/utils/auth-mobile.utils';
import { assertNonNullish } from '@dfinity/utils';
import { KEY_STORAGE_DELEGATION, KEY_STORAGE_KEY } from '@icp-sdk/auth/client';
import { DelegationChain, Ed25519KeyIdentity } from '@icp-sdk/core/identity';

const browserOpenMock = vi.fn();
const browserCloseMock = vi.fn();

vi.mock('@capacitor/browser', () => ({
	Browser: {
		open: (...args: unknown[]) => browserOpenMock(...args),
		close: (...args: unknown[]) => browserCloseMock(...args)
	}
}));

let appUrlOpenListener: ((event: { url: string }) => void) | undefined;

vi.mock('@capacitor/app', () => ({
	App: {
		addListener: vi.fn((...[_event, cb]: [string, (event: { url: string }) => void]) => {
			appUrlOpenListener = cb;
			return Promise.resolve({ remove: vi.fn() });
		}),
		getLaunchUrl: vi.fn(() => Promise.resolve(undefined))
	}
}));

describe('auth-mobile services', () => {
	const storageMap = new Map<string, string>();

	const storageMock = {
		get: vi.fn((key: string) => Promise.resolve(storageMap.get(key) ?? null)),
		set: vi.fn((...[key, value]: [string, string]) => {
			storageMap.set(key, value);
			return Promise.resolve();
		}),
		remove: vi.fn((key: string) => {
			storageMap.delete(key);
			return Promise.resolve();
		})
	};

	const createAuthClientMock = vi.fn(() => Promise.resolve({}));

	// Delivers the deep-link callback as the OS would: through the listener
	// registered at boot, after the sign-in promise is already pending.
	const emitCallback = async (url: string) => {
		await initMobileAuthListener();
		appUrlOpenListener?.({ url });
		// Let the async callback handler run to completion.
		await vi.waitFor(() => expect(browserCloseMock).toHaveBeenCalled());
	};

	const buildValidCallbackUrl = async (): Promise<string> => {
		// The session key is persisted just before the browser opens — wait for
		// that point so the key is guaranteed to be in storage.
		await vi.waitFor(() => expect(browserOpenMock).toHaveBeenCalled());

		const storedKey = storageMap.get(KEY_STORAGE_KEY);

		assertNonNullish(storedKey);

		const sessionKey = Ed25519KeyIdentity.fromJSON(storedKey);
		const rootKey = Ed25519KeyIdentity.generate();
		const chain = await DelegationChain.create(
			rootKey,
			sessionKey.getPublicKey(),
			new Date(Date.now() + 60_000)
		);

		return buildMobileAuthCallbackUrl({
			redirectUri: MOBILE_AUTH_CALLBACK_URI,
			delegationChainJson: JSON.stringify(chain.toJSON())
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		storageMap.clear();
		appUrlOpenListener = undefined;

		vi.spyOn(AuthClientProvider, 'getInstance').mockReturnValue({
			storage: storageMock,
			createAuthClient: createAuthClientMock
		} as unknown as AuthClientProvider);

		vi.spyOn(authStore, 'forceSync').mockResolvedValue(undefined);
	});

	it('should not settle before the deep-link callback arrives', async () => {
		const pending = signInMobile();

		const settled = await Promise.race([pending.then(() => true), Promise.resolve(false)]);

		expect(settled).toBeFalsy();
		expect(browserOpenMock).toHaveBeenCalledOnce();
	});

	it('should resolve ok once the callback is validated and persisted', async () => {
		const pending = signInMobile();

		await emitCallback(await buildValidCallbackUrl());

		await expect(pending).resolves.toEqual({ status: 'ok' });

		expect(authStore.forceSync).toHaveBeenCalledOnce();
		expect(createAuthClientMock).toHaveBeenCalledWith({ forceRecreate: true });
	});

	it('should resolve with an error when the callback carries an invalid chain', async () => {
		vi.spyOn(toastsStore, 'toastsError').mockImplementation(vi.fn());

		const pending = signInMobile();

		await initMobileAuthListener();
		appUrlOpenListener?.({ url: `${MOBILE_AUTH_CALLBACK_URI}#delegation=not-json` });

		await expect(pending).resolves.toMatchObject({ status: 'error' });

		expect(authStore.forceSync).not.toHaveBeenCalled();
	});

	it('should supersede a previous pending sign-in when a new one starts', async () => {
		const first = signInMobile();
		const second = signInMobile();

		await expect(first).resolves.toEqual({ status: 'superseded' });

		await emitCallback(await buildValidCallbackUrl());

		await expect(second).resolves.toEqual({ status: 'ok' });
	});

	it('should reject and clear the pending state when the browser cannot open', async () => {
		browserOpenMock.mockRejectedValueOnce(new Error('no browser'));

		await expect(signInMobile()).rejects.toThrow('no browser');
	});

	it('should clear a stale delegation before persisting the new session key', async () => {
		storageMap.set(KEY_STORAGE_DELEGATION, 'stale-delegation');

		const pending = signInMobile();

		await vi.waitFor(() => expect(browserOpenMock).toHaveBeenCalled());

		expect(storageMap.has(KEY_STORAGE_DELEGATION)).toBeFalsy();
		expect(storageMap.has(KEY_STORAGE_KEY)).toBeTruthy();

		// Avoid leaking the pending promise into other tests.
		void signInMobile();

		await expect(pending).resolves.toEqual({ status: 'superseded' });
	});
});
