import type {
	MobileNavigationState,
	MobileRoot,
	MobileSheetRequest,
	MobileWalletRequest
} from '$lib/schema/mobile-host.schema';
import type {} from '$lib/types/mobile-host';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import * as z from 'zod';

export interface MobileHostTransport {
	wallet(options: {
		version: 2;
		documentId: string;
		request: MobileWalletRequest;
	}): Promise<unknown>;
	ready(options: { version: 2 }): Promise<unknown>;
	sheet(options: MobileSheetRequest & { version: 2; documentId: string }): Promise<void>;
	navigate(options: { version: 2; documentId: string; root: MobileRoot }): Promise<void>;
	navigationState(options: MobileNavigationState & { documentId: string }): Promise<void>;
	openAccount(options: { version: 2; documentId: string }): Promise<void>;
	presentation(options: { version: 2; documentId: string; blocking: boolean }): Promise<void>;
	prepareBack(options: {
		version: 2;
		documentId: string;
		root: 'wallet' | 'search';
		backPath: string;
	}): Promise<void>;
	clearBack(options: { version: 2; documentId: string }): Promise<void>;
	finishRefresh(options: { version: 2; documentId: string; requestId: number }): Promise<void>;
	addListener(
		event: 'navigate' | 'back' | 'refresh' | 'dismissSheet',
		listener: (value: unknown) => void
	): Promise<PluginListenerHandle>;
}
const bundledHost = registerPlugin<MobileHostTransport>('OisyHost');
const liveHost = () => (typeof window === 'undefined' ? undefined : window.__oisyHost);
const ReplySchema = z.discriminatedUnion('ok', [
	z.object({ ok: z.literal(true), value: z.unknown() }).strict(),
	z.object({ ok: z.literal(false), code: z.literal('OPERATION_JOURNAL_CONFLICT') }).strict()
]);
const request = async ({
	method,
	options
}: {
	method: string;
	options: unknown;
}): Promise<unknown> => {
	const host = liveHost();
	if (!host || !mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	const result = ReplySchema.parse(await host.request(method, options));
	if (!result.ok) {
		throw Object.assign(new Error('Operation journal changed'), { code: result.code });
	}
	return result.value;
};
const command = async (args: { method: string; options: unknown }): Promise<void> => {
	await request(args);
};

// Existing packaged hosts remain compatible. New live hosts use only the narrow
// WebKit transport; feature components do not know either transport's API.
export const mobileHostTransport: MobileHostTransport = {
	sheet: (options) => command({ method: 'sheet', options }),
	ready: (options) =>
		liveHost() ? request({ method: 'ready', options }) : bundledHost.ready(options),
	wallet: (options) =>
		liveHost() ? request({ method: 'wallet', options }) : bundledHost.wallet(options),
	navigate: (options) =>
		liveHost() ? command({ method: 'navigate', options }) : bundledHost.navigate(options),
	navigationState: (options) =>
		liveHost()
			? command({ method: 'navigationState', options })
			: bundledHost.navigationState(options),
	openAccount: (options) =>
		liveHost() ? command({ method: 'openAccount', options }) : bundledHost.openAccount(options),
	presentation: (options) =>
		liveHost() ? command({ method: 'presentation', options }) : bundledHost.presentation(options),
	prepareBack: (options) =>
		liveHost() ? command({ method: 'prepareBack', options }) : bundledHost.prepareBack(options),
	clearBack: (options) =>
		liveHost() ? command({ method: 'clearBack', options }) : bundledHost.clearBack(options),
	finishRefresh: (options) =>
		liveHost() ? command({ method: 'finishRefresh', options }) : bundledHost.finishRefresh(options),
	addListener: (...args) => {
		const host = liveHost();
		return host ? host.addListener(...args) : bundledHost.addListener(...args);
	}
};

// A build/platform guard is useful here, but native frame/origin validation is the trust boundary.
export const mobileHostAvailable = (): boolean => {
	const host = liveHost();
	if (host) {
		return (
			host.version === 2 &&
			host.transport === 'wk' &&
			(globalThis.location?.protocol === 'https:' ||
				(import.meta.env.VITE_MOBILE_UI_TEST === 'true' &&
					globalThis.location?.protocol === 'capacitor:' &&
					globalThis.location.hostname === 'localhost')) &&
			typeof host.request === 'function' &&
			typeof host.addListener === 'function'
		);
	}
	return (
		import.meta.env.VITE_MOBILE_SHELL === 'true' &&
		Capacitor.isNativePlatform() &&
		globalThis.location?.hostname === 'localhost' &&
		((Capacitor.getPlatform() === 'ios' && globalThis.location.protocol === 'capacitor:') ||
			(Capacitor.getPlatform() === 'android' && globalThis.location.protocol === 'https:'))
	);
};
