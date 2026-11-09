/** Injected by the native host before website code runs; never a caller-supplied URL. */
export interface WebKitMobileHost {
	readonly version: number;
	readonly transport: 'wk';
	readonly documentId: string;
	request(method: string, options: unknown): Promise<unknown>;
	addListener(
		event: 'navigate' | 'back' | 'refresh',
		listener: (value: unknown) => void
	): Promise<{ remove(): Promise<void> }>;
}

declare global {
	interface Window {
		readonly __oisyHost?: WebKitMobileHost;
	}
}
