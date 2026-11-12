import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { AppWorker } from '$lib/services/_worker.services';
import {
	connectMobileHost,
	requestMobileWallet,
	setMobilePresentation
} from '$lib/services/mobile-host.services';
import { createMobileIdentity } from '$lib/services/mobile-session.services';
import { cancelWalletRefresh } from '$lib/services/wallet-refresh.services';
import { mobileRuntimeRecoveryStore, mobileScreenStore } from '$lib/stores/mobile-host.store';
import { isSessionGoneError } from '@oisy/mobile-session';

let current: Awaited<ReturnType<typeof createMobileIdentity>> | undefined;
let initializing: Promise<void> | undefined;
let generation = 0;
let ending: Promise<void> | undefined;
let recovering: Promise<boolean> | undefined;
const sessionLifetime = new AbortController();
let disconnect: (() => Promise<void>) | undefined;

export const initializeMobileRuntime = (): Promise<void> => {
	initializing ??= (async () => {
		const started = generation;
		const connection = await connectMobileHost((request) => {
			if (started === generation) {
				mobileScreenStore.set(request);
			}
		});
		if (started !== generation) {
			await connection.disconnect();
			throw new Error('Session ended');
		}
		({ disconnect } = connection);
		if (!connection.capabilities.includes('sessionHandoff')) {
			await connection.disconnect();
			throw new Error('This app does not support the SDK session handoff');
		}
		const session = await createMobileIdentity({
			signal: sessionLifetime.signal,
			onSessionGone: () => {
				if (started === generation) {
					void endMobileRuntime().catch(() => undefined);
				}
			}
		});
		if (started !== generation) {
			session.close();
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

const disposeLocalRuntime = (): void => {
	generation++;
	sessionLifetime.abort();
	current?.close();
	current = undefined;
	cancelWalletRefresh();
	AppWorker.terminateAllWorkers();
	AuthClientProvider.getInstance().setMobileIdentity(undefined);
};

// A failed network bootstrap is recoverable. Discard this document's child keys but
// leave the native session intact. Retry reloads the document to obtain a new handoff.
export const handleMobileRuntimeFailure = async (error: unknown): Promise<boolean> => {
	if (isSessionGoneError(error) || ending) {
		await endMobileRuntime();
		return false;
	}
	recovering ??= (async () => {
		mobileRuntimeRecoveryStore.set(true);
		const account = current && {
			grantID: current.grantID,
			principal: current.identity.getPrincipal().toText()
		};
		disposeLocalRuntime();
		await Promise.allSettled([
			setMobilePresentation(true),
			...(account ? [requestMobileWallet({ method: 'account', ...account })] : [])
		]);
		await disconnect?.();
		disconnect = undefined;
		return true;
	})();
	return recovering;
};

export const endMobileRuntime = (
	method: 'signOut' | 'sessionExpired' = 'sessionExpired'
): Promise<void> => {
	ending ??= (async () => {
		disposeLocalRuntime();
		// Native removes the entire nonpersistent runtime, including private stores and cached clients.
		try {
			await requestMobileWallet({ method });
		} finally {
			await disconnect?.();
			disconnect = undefined;
		}
	})();
	return ending;
};
