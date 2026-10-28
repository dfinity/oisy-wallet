import {
	MobileBackEventSchema,
	MobileBackPreparationSchema,
	MobileHandshakeSchema,
	MobileNavigationSchema,
	MobileNavigationStateSchema,
	MobileRefreshSchema,
	MobileWalletRequestSchema,
	MobileWalletResponseSchema,
	type MobileNavigationRequest,
	type MobileNavigationState,
	type MobileRoot,
	type MobileWalletRequest
} from '$lib/schema/mobile-host.schema';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface MobileHostPlugin {
	wallet(options: { version: 2; request: MobileWalletRequest }): Promise<unknown>;
	ready(options: { version: 2 }): Promise<unknown>;
	navigate(options: { version: 2; root: MobileRoot }): Promise<void>;
	navigationState(options: MobileNavigationState): Promise<void>;
	openAccount(options: { version: 2 }): Promise<void>;
	presentation(options: { version: 2; blocking: boolean }): Promise<void>;
	prepareBack(options: { version: 2; root: 'wallet' | 'search'; backPath: string }): Promise<void>;
	clearBack(options: { version: 2 }): Promise<void>;
	finishRefresh(options: { version: 2; requestId: number }): Promise<void>;
	addListener(
		event: 'navigate' | 'back' | 'refresh',
		listener: (value: unknown) => void
	): Promise<PluginListenerHandle>;
}
const host = registerPlugin<MobileHostPlugin>('OisyHost');

// A build/platform guard is useful here, but native frame/origin validation is the trust boundary.
export const mobileHostAvailable = (): boolean =>
	import.meta.env.VITE_MOBILE_SHELL === 'true' &&
	Capacitor.isNativePlatform() &&
	globalThis.location?.hostname === 'localhost' &&
	((Capacitor.getPlatform() === 'ios' && globalThis.location.protocol === 'capacitor:') ||
		(Capacitor.getPlatform() === 'android' && globalThis.location.protocol === 'https:'));

export const connectMobileHost = async (onNavigate: (request: MobileNavigationRequest) => void) => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	let latestRequestId = -1;
	const dispatch = (request: MobileNavigationRequest) => {
		// An older ready response must not overwrite a selection received while it was in flight.
		if (request.requestId < latestRequestId) {
			return;
		}
		latestRequestId = request.requestId;
		onNavigate(request);
	};
	// Subscribe before ready so a root selection during startup is not lost.
	const listener = await host.addListener('navigate', (value) => {
		const result = MobileNavigationSchema.safeParse(value);
		if (result.success) {
			dispatch({ screen: result.data.root, requestId: result.data.requestId ?? 0 });
		}
	});
	try {
		const state = MobileHandshakeSchema.parse(await host.ready({ version: 2 }));
		dispatch({ screen: state.root, requestId: state.requestId ?? 0 });
		return { ...state, disconnect: () => listener.remove() };
	} catch (error) {
		await listener.remove();
		throw error;
	}
};
export const navigateMobileHost = async (root: MobileRoot): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.navigate({ version: 2, root });
};
export const publishMobileNavigation = async (
	state: Omit<MobileNavigationState, 'version'>
): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.navigationState(MobileNavigationStateSchema.parse({ version: 2, ...state }));
};
export const openMobileAccount = async (): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.openAccount({ version: 2 });
};

// Presentation only: this command grants no data or wallet capabilities.
export const setMobilePresentation = async (blocking: boolean): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.presentation({ version: 2, blocking });
};

export const requestMobileWallet = async (request: Record<string, string>): Promise<string> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	const payload = MobileWalletRequestSchema.parse(request);
	return MobileWalletResponseSchema.parse(await host.wallet({ version: 2, request: payload }))
		.response;
};

// Separate from startup/auth: these listeners live only while the shared wallet is mounted.
export const connectMobileInteractions = async ({
	onBack,
	onRefresh
}: {
	onBack: () => void;
	onRefresh: (requestId: number) => Promise<void>;
}) => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	const listeners: PluginListenerHandle[] = [];
	let active = true;
	let lastRefreshId = -1;
	const disconnect = async () => {
		active = false;
		await Promise.allSettled(listeners.map((listener) => listener.remove()));
	};
	try {
		listeners.push(
			await host.addListener('back', (value) => {
				if (active && MobileBackEventSchema.safeParse(value).success) {
					onBack();
				}
			})
		);
		listeners.push(
			await host.addListener('refresh', (value) => {
				const result = MobileRefreshSchema.safeParse(value);
				if (!active || !result.success || result.data.requestId <= lastRefreshId) {
					return;
				}
				lastRefreshId = result.data.requestId;
				void onRefresh(lastRefreshId);
			})
		);
		return disconnect;
	} catch (error) {
		await disconnect();
		throw error;
	}
};
export const prepareMobileBack = async (parent: {
	root: 'wallet' | 'search';
	backPath: string;
}): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.prepareBack(MobileBackPreparationSchema.parse({ version: 2, ...parent }));
};
export const finishMobileRefresh = async (requestId: number): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.finishRefresh(MobileRefreshSchema.parse({ version: 2, requestId }));
};

export const clearMobileBack = async (): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.clearBack({ version: 2 });
};
