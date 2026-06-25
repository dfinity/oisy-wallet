import type {
	WalletConnectBtcAccountAddresses,
	WalletConnectBtcApproveRequestMessage,
	WalletConnectBtcApproveSignPsbtMessage
} from '$btc/types/wallet-connect';
import type { WalletConnectEthApproveRequestMessage } from '$eth/types/wallet-connect';
import type { WebSocketListener } from '$lib/types/listener';
import type { WalletConnectSolApproveRequestMessage } from '$sol/types/wallet-connect';
import type { Nullish } from '@dfinity/zod-schemas';
import type { WalletKitTypes } from '@reown/walletkit';
import type { ErrorResponse } from '@walletconnect/jsonrpc-utils';
import type { PairingTypes, SessionTypes } from '@walletconnect/types';

export type WalletConnectApproveRequestMessage =
	| WalletConnectBtcApproveRequestMessage
	| WalletConnectBtcAccountAddresses
	| WalletConnectBtcApproveSignPsbtMessage
	| WalletConnectEthApproveRequestMessage
	| WalletConnectSolApproveRequestMessage;

export abstract class WalletConnectListener implements WebSocketListener {
	abstract pair(uri: string): Promise<PairingTypes.Struct>;
	abstract approveSession(proposal: WalletKitTypes.SessionProposal): Promise<void>;
	abstract rejectSession(proposal: WalletKitTypes.SessionProposal): Promise<void>;
	abstract attachHandlers(handlers: {
		onSessionProposal: (proposal: WalletKitTypes.SessionProposal) => void;
		onSessionDelete: () => void;
		onSessionRequest: (request: WalletKitTypes.SessionRequest) => Promise<void>;
	}): void;
	abstract detachHandlers(): void;
	abstract rejectRequest(params: {
		id: number;
		topic: string;
		error: ErrorResponse;
	}): Promise<void>;
	abstract getActiveSessions(): Record<string, SessionTypes.Struct>;
	abstract approveRequest(params: {
		id: number;
		topic: string;
		message: WalletConnectApproveRequestMessage;
	}): Promise<void>;
	// Disconnect a single session by topic, leaving any other sessions and pairings intact.
	abstract disconnectSession(topic: string): Promise<void>;
	abstract disconnect(): Promise<void>;
}

export type OptionWalletConnectListener = Nullish<WalletConnectListener>;
