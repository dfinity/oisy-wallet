import {
	mobileHostTransport as host,
	mobileHostAvailable
} from '$lib/providers/mobile-host.providers';
import {
	MobileBackEventSchema,
	MobileBackPreparationSchema,
	MobileHandshakeSchema,
	MobileNavigationSchema,
	MobileNavigationStateSchema,
	MobileRefreshEventSchema,
	MobileRefreshSchema,
	MobileSheetDismissSchema,
	MobileSheetRequestSchema,
	MobileWalletRequestSchema,
	MobileWalletResponseSchema,
	type MobileNavigationRequest,
	type MobileNavigationState,
	type MobileRoot,
	type MobileSheetRequest
} from '$lib/schema/mobile-host.schema';
import type { MobileHostListener } from '$lib/types/mobile-host';

export { mobileHostAvailable } from '$lib/providers/mobile-host.providers';

let activeDocument: string | undefined;
let activeCapabilities: readonly string[] = [];
export const nativeSheetsAvailable = () =>
	mobileHostAvailable() && !!activeDocument && activeCapabilities.includes('nativeSheets');
export const contentSizedSheetsAvailable = () =>
	nativeSheetsAvailable() && activeCapabilities.includes('contentSizedSheets');
let connectionGeneration = 0;
const documentRequest = () => {
	if (!mobileHostAvailable() || !activeDocument) {
		throw new Error('Mobile host unavailable');
	}
	return { version: 2 as const, documentId: activeDocument };
};

export const connectMobileHost = async (onNavigate: (request: MobileNavigationRequest) => void) => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	const generation = ++connectionGeneration;
	activeDocument = undefined;
	activeCapabilities = [];
	let latestRequestId = -1;
	let document: string | undefined;
	const pending: unknown[] = [];
	const dispatch = (value: unknown) => {
		const result = MobileNavigationSchema.safeParse(value);
		if (!result.success || generation !== connectionGeneration) {
			return;
		}
		if (!document) {
			pending.push(result.data);
			if (pending.length > 32) {
				pending.shift();
			}
			return;
		}
		if (result.data.documentId !== document) {
			return;
		}
		const requestId = result.data.requestId ?? 0;
		if (requestId < latestRequestId) {
			return;
		}
		latestRequestId = requestId;
		onNavigate({ screen: result.data.root, requestId });
	};
	const listener = await host.addListener('navigate', dispatch);
	try {
		const state = MobileHandshakeSchema.parse(await host.ready({ version: 2 }));
		if (generation !== connectionGeneration) {
			throw new Error('Superseded host connection');
		}
		if (
			!['nativeNavigation', 'delegation', 'sessionHandoff', 'documentBinding'].every((capability) =>
				state.capabilities.includes(capability)
			)
		) {
			throw new Error('Unsupported host capabilities');
		}
		document = state.documentId;
		activeDocument = document;
		activeCapabilities = state.capabilities;
		for (const event of pending) {
			dispatch(event);
		}
		pending.length = 0;
		dispatch({
			version: 2,
			documentId: document,
			root: state.root,
			requestId: state.requestId ?? 0
		});
		return {
			...state,
			disconnect: async () => {
				if (generation === connectionGeneration) {
					activeDocument = undefined;
					activeCapabilities = [];
					connectionGeneration++;
				}
				await listener.remove();
			}
		};
	} catch (error) {
		if (generation === connectionGeneration) {
			activeDocument = undefined;
			activeCapabilities = [];
		}
		await listener.remove();
		throw error;
	}
};
export const navigateMobileHost = async (root: MobileRoot): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.navigate({ ...documentRequest(), root });
};
export const publishMobileNavigation = async (
	state: Omit<MobileNavigationState, 'version'>
): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.navigationState({
		...MobileNavigationStateSchema.parse({ version: 2, ...state }),
		...documentRequest()
	});
};
export const openMobileAccount = async (): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.openAccount(documentRequest());
};

// Presentation only: this command grants no data or wallet capabilities.
export const setMobilePresentation = async (blocking: boolean): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.presentation({ ...documentRequest(), blocking });
};

export const requestMobileWallet = async (request: Record<string, string>): Promise<string> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	const payload = MobileWalletRequestSchema.parse(request);
	return MobileWalletResponseSchema.parse(
		await host.wallet({ ...documentRequest(), request: payload })
	).response;
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
	const listeners: MobileHostListener[] = [];
	const document = documentRequest().documentId;
	let active = true;
	let lastRefreshId = -1;
	const disconnect = async () => {
		active = false;
		await Promise.allSettled(listeners.map((listener) => listener.remove()));
	};
	try {
		listeners.push(
			await host.addListener('back', (value) => {
				const result = MobileBackEventSchema.safeParse(value);
				if (
					active &&
					activeDocument === document &&
					result.success &&
					result.data.documentId === document
				) {
					onBack();
				}
			})
		);
		listeners.push(
			await host.addListener('refresh', (value) => {
				const result = MobileRefreshEventSchema.safeParse(value);
				if (
					!active ||
					activeDocument !== document ||
					!result.success ||
					result.data.documentId !== document ||
					result.data.requestId <= lastRefreshId
				) {
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
	await host.prepareBack({
		...MobileBackPreparationSchema.parse({ version: 2, ...parent }),
		...documentRequest()
	});
};
export const finishMobileRefresh = async (requestId: number): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.finishRefresh({
		...MobileRefreshSchema.parse({ version: 2, requestId }),
		...documentRequest()
	});
};

export const clearMobileBack = async (): Promise<void> => {
	if (!mobileHostAvailable()) {
		throw new Error('Mobile host unavailable');
	}
	await host.clearBack(documentRequest());
};

export const presentMobileSheet = async (request: MobileSheetRequest): Promise<void> => {
	if (!nativeSheetsAvailable()) {
		throw new Error('Native sheets unavailable');
	}
	await host.sheet({ ...MobileSheetRequestSchema.parse(request), ...documentRequest() });
};
export const connectMobileSheetDismiss = (onDismiss: (id: string) => void) => {
	const document = documentRequest().documentId;
	return host.addListener('dismissSheet', (value) => {
		const result = MobileSheetDismissSchema.safeParse(value);
		if (activeDocument === document && result.success && result.data.documentId === document) {
			onDismiss(result.data.id);
		}
	});
};
