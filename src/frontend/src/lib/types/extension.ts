import type {
	ExtensionChainSchema,
	ExtensionConnectRequestSchema,
	ExtensionPairRequestSchema,
	ExtensionPanelStateMessageSchema,
	ExtensionRequestSchema,
	ExtensionSignRequestSchema,
	ExtensionSitesSchema
} from '$lib/schema/extension.schema';
import type * as z from 'zod';

export type ExtensionChain = z.infer<typeof ExtensionChainSchema>;

export type ExtensionPairRequest = z.infer<typeof ExtensionPairRequestSchema>;

export type ExtensionConnectRequest = z.infer<typeof ExtensionConnectRequestSchema>;

export type ExtensionSignRequest = z.infer<typeof ExtensionSignRequestSchema>;

export type ExtensionRequest = z.infer<typeof ExtensionRequestSchema>;

export type ExtensionSites = z.infer<typeof ExtensionSitesSchema>;

export type ExtensionPanelState = z.infer<typeof ExtensionPanelStateMessageSchema>['state'];

export type ExtensionVersionStatus = 'supported' | 'outdated' | 'blocked';

export interface ExtensionError {
	code: number;
	message: string;
}

export interface ExtensionAccount {
	eth: string;
	sol: string;
}

export type ExtensionOutgoingMessage =
	| { type: 'get-request'; id: string }
	| { type: 'ping' }
	| { type: 'update-check' }
	| { type: 'get-state' }
	| { type: 'set-account'; account: ExtensionAccount }
	| { type: 'revoke-site'; origin: string }
	| { type: 'response'; id: string; result: unknown }
	| { type: 'error'; id: string; error: ExtensionError };

// The part of `chrome.runtime.Port` a page sees when an extension lists it in `externally_connectable`.
export interface ExtensionPort {
	postMessage: (message: ExtensionOutgoingMessage) => void;
	disconnect: () => void;
	onMessage: { addListener: (listener: (message: unknown) => void) => void };
	onDisconnect: { addListener: (listener: () => void) => void };
}
