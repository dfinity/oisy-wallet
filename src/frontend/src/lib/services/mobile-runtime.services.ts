import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { AppWorker } from '$lib/services/_worker.services';
import { connectMobileHost, requestMobileWallet } from '$lib/services/mobile-host.services';
import { createMobileIdentity } from '$lib/services/mobile-session.services';
import { mobileScreenStore } from '$lib/stores/mobile-host.store';

let current: Awaited<ReturnType<typeof createMobileIdentity>> | undefined;
let initializing: Promise<void> | undefined;
let generation = 0;
let disconnect: (() => Promise<void>) | undefined;

export const initializeMobileRuntime = (): Promise<void> => {
	initializing ??= (async () => {
		const started = generation;
		const connection = await connectMobileHost((screen) => {
			if (started === generation) {
				mobileScreenStore.update(({ request }) => ({ screen, request: request + 1 }));
			}
		});
		if (started !== generation) {
			await connection.disconnect();
			throw new Error('Session ended');
		}
		({ disconnect } = connection);
		const session = await createMobileIdentity();
		if (started !== generation) {
			throw new Error('Session ended');
		}
		current = session;
		AuthClientProvider.getInstance().setMobileIdentity(session.identity);
	})();
	return initializing;
};

export const publishMobileAccount = async (address: string | undefined): Promise<void> => {
	const session = current;
	if (!session || session.expiresAt <= Date.now()) {
		return;
	}
	await requestMobileWallet({
		method: 'account',
		grantID: session.grantID,
		principal: session.identity.getPrincipal().toText(),
		...(address ? { address } : {})
	});
};

export const endMobileRuntime = async (
	method: 'signOut' | 'sessionExpired' = 'sessionExpired'
): Promise<void> => {
	generation++;
	current = undefined;
	AppWorker.terminateAllWorkers();
	AuthClientProvider.getInstance().setMobileIdentity(undefined);
	// Native removes the entire nonpersistent runtime, including private stores and cached clients.
	try {
		await requestMobileWallet({ method });
	} finally {
		await disconnect?.();
		disconnect = undefined;
	}
};
