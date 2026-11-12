import type {
	MobileNavigationState,
	MobileRoot,
	MobileSheetRequest,
	MobileWalletRequest
} from '$lib/schema/mobile-host.schema';
import type { MobileHostListener } from '$lib/types/mobile-host';
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
	): Promise<MobileHostListener>;
}
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

// Feature components use this contract; only the document-start WebKit bridge implements it.
export const mobileHostTransport: MobileHostTransport = {
	sheet: (options) => command({ method: 'sheet', options }),
	ready: (options) => request({ method: 'ready', options }),
	wallet: (options) => request({ method: 'wallet', options }),
	navigate: (options) => command({ method: 'navigate', options }),
	navigationState: (options) => command({ method: 'navigationState', options }),
	openAccount: (options) => command({ method: 'openAccount', options }),
	presentation: (options) => command({ method: 'presentation', options }),
	prepareBack: (options) => command({ method: 'prepareBack', options }),
	clearBack: (options) => command({ method: 'clearBack', options }),
	finishRefresh: (options) => command({ method: 'finishRefresh', options }),
	addListener: async (...args) => {
		const host = liveHost();
		if (!host || !mobileHostAvailable()) {
			throw new Error('Mobile host unavailable');
		}
		return await host.addListener(...args);
	}
};

// Presentation guard only: native frame/origin validation remains the trust boundary.
export const mobileHostAvailable = (): boolean => {
	const host = liveHost();
	return (
		host !== undefined &&
		host.version === 2 &&
		host.transport === 'wk' &&
		(globalThis.location?.protocol === 'https:' ||
			(import.meta.env.VITE_MOBILE_UI_TEST === 'true' &&
				globalThis.location?.protocol === 'oisy-test:' &&
				globalThis.location.hostname === 'localhost')) &&
		typeof host.request === 'function' &&
		typeof host.addListener === 'function'
	);
};
