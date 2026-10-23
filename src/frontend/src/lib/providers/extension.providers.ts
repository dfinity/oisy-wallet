import {
	OISY_EXTENSION_ID,
	OISY_EXTENSION_PANEL_READY,
	OISY_EXTENSION_PORT_NAME
} from '$lib/constants/extension.constants';
import type { ExtensionPort } from '$lib/types/extension';
import {
	WalletConnectListener,
	type WalletConnectApproveRequestMessage
} from '$lib/types/wallet-connect';
import { isNullish } from '@dfinity/utils';
import type { ErrorResponse } from '@walletconnect/jsonrpc-utils';
import type { PairingTypes, SessionTypes } from '@walletconnect/types';

interface ChromeRuntime {
	connect?: (extensionId: string, connectInfo: { name: string }) => ExtensionPort;
}

/**
 * Open a port to the OISY extension. Chrome exposes `chrome.runtime` to this page only because the
 * extension lists it in `externally_connectable`, and the port reaches only the extension with
 * this ID, so no other extension can answer.
 */
export const connectExtension = ({ name = OISY_EXTENSION_PORT_NAME }: { name?: string } = {}):
	ExtensionPort | undefined => {
	const { chrome } = globalThis as { chrome?: { runtime?: ChromeRuntime } };
	const runtime = chrome?.runtime;

	if (isNullish(runtime?.connect)) {
		return;
	}

	try {
		return runtime.connect(OISY_EXTENSION_ID, { name });
	} catch (_: unknown) {
		// Chrome throws when the extension is missing or disabled; the popup shows that state.
		return undefined;
	}
};

/**
 * Tell the extension's side panel that OISY's page inside it has started, so it can swap its
 * loading state for the page. Only our extension's page can receive it: the target origin is
 * pinned to our extension ID.
 */
export const announcePanelReady = () => {
	if (window.parent === window) {
		return;
	}

	window.parent.postMessage(
		{ type: OISY_EXTENSION_PANEL_READY },
		`chrome-extension://${OISY_EXTENSION_ID}`
	);
};

const notAvailable = (): Promise<never> =>
	Promise.reject(new Error('Not available for requests from the OISY extension.'));

/**
 * Lets the WalletConnect review screens answer a request that came from the extension. They only
 * ever call `approveRequest` or `rejectRequest`; the session methods have no meaning here.
 */
export class ExtensionWalletConnectListener extends WalletConnectListener {
	readonly #onApprove: (message: WalletConnectApproveRequestMessage) => void;
	readonly #onReject: (error: ErrorResponse) => void;

	constructor({
		onApprove,
		onReject
	}: {
		onApprove: (message: WalletConnectApproveRequestMessage) => void;
		onReject: (error: ErrorResponse) => void;
	}) {
		super();
		this.#onApprove = onApprove;
		this.#onReject = onReject;
	}

	approveRequest({
		message
	}: {
		id: number;
		topic: string;
		message: WalletConnectApproveRequestMessage;
	}): Promise<void> {
		this.#onApprove(message);
		return Promise.resolve();
	}

	rejectRequest({ error }: { id: number; topic: string; error: ErrorResponse }): Promise<void> {
		this.#onReject(error);
		return Promise.resolve();
	}

	getActiveSessions(): Record<string, SessionTypes.Struct> {
		return {};
	}

	pair(): Promise<PairingTypes.Struct> {
		return notAvailable();
	}

	approveSession(): Promise<void> {
		return notAvailable();
	}

	rejectSession(): Promise<void> {
		return notAvailable();
	}

	attachHandlers(): void {}

	detachHandlers(): void {}

	disconnectSession(): Promise<void> {
		return Promise.resolve();
	}

	disconnect(): Promise<void> {
		return Promise.resolve();
	}
}
