import type { WalletConnectEthApproveRequestMessage } from '$eth/types/wallet-connect';
import type { WebSocketListener } from '$lib/types/listener';
import type { Option } from '$lib/types/utils';
import type { WalletConnectSolApproveRequestMessage } from '$sol/types/wallet-connect';
import type { WalletKitTypes } from '@reown/walletkit';
import type { ErrorResponse } from '@walletconnect/jsonrpc-utils';
import type { PairingTypes, SessionTypes } from '@walletconnect/types';

export type WalletConnectApproveRequestMessage =
	| WalletConnectEthApproveRequestMessage
	| WalletConnectSolApproveRequestMessage;

export abstract class WalletConnectListener implements WebSocketListener {
	abstract pair(uri: string): Promise<PairingTypes.Struct>;
	abstract approveSession(proposal: WalletKitTypes.SessionProposal): Promise<void>;
	abstract rejectSession(proposal: WalletKitTypes.SessionProposal): Promise<void>;
	abstract sessionProposal(callback: (proposal: WalletKitTypes.SessionProposal) => void): void;
	abstract sessionDelete(callback: () => void): void;
	abstract sessionRequest(
		callback: (request: WalletKitTypes.SessionRequest) => Promise<void>
	): void;
	abstract offSessionProposal(callback: (proposal: WalletKitTypes.SessionProposal) => void): void;
	abstract offSessionDelete(callback: () => void): void;
	abstract offSessionRequest(
		callback: (request: WalletKitTypes.SessionRequest) => Promise<void>
	): void;
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
	abstract disconnect(): Promise<void>;
}

export type OptionWalletConnectListener = Option<WalletConnectListener>;
