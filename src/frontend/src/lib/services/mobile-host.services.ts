import {
	MobileHandshakeSchema,
	MobileNavigationSchema,
	MobileWalletRequestSchema,
	MobileWalletResponseSchema,
	type MobileRoot,
	type MobileScreen,
	type MobileWalletRequest
} from '$lib/schema/mobile-host.schema';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface MobileHostPlugin {
	wallet(options: { version: 2; request: MobileWalletRequest }): Promise<unknown>;
	ready(options: { version: 2 }): Promise<unknown>;
	navigate(options: { version: 2; root: MobileRoot }): Promise<void>;
	openAccount(options: { version: 2 }): Promise<void>;
	presentation(options: { version: 2; blocking: boolean }): Promise<void>;
	addListener(event: 'navigate', listener: (value: unknown) => void): Promise<PluginListenerHandle>;
}
const host = registerPlugin<MobileHostPlugin>('OisyHost');

// A build/platform guard is useful here, but native frame/origin validation is the trust boundary.
export const mobileHostAvailable = (): boolean =>
	import.meta.env.VITE_MOBILE_SHELL === 'true' &&
	Capacitor.isNativePlatform() &&
	globalThis.location?.hostname === 'localhost' &&
	((Capacitor.getPlatform() === 'ios' && globalThis.location.protocol === 'capacitor:') ||
		(Capacitor.getPlatform() === 'android' && globalThis.location.protocol === 'https:'));

export const connectMobileHost = async (onNavigate: (root: MobileScreen) => void) => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	// Subscribe before ready so a root selection during startup is not lost.
	const listener = await host.addListener('navigate', (value) => {
		const result = MobileNavigationSchema.safeParse(value);
		if (result.success) {
			onNavigate(result.data.root);
		}
	});
	try {
		const state = MobileHandshakeSchema.parse(await host.ready({ version: 2 }));
		onNavigate(state.root);
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
