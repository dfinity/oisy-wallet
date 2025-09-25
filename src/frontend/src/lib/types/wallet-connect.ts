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

export interface WalletConnectListener extends WebSocketListener {
	pair: (uri: string) => Promise<PairingTypes.Struct>;
	approveSession: (proposal: WalletKitTypes.SessionProposal) => Promise<void>;
	rejectSession: (proposal: WalletKitTypes.SessionProposal) => Promise<void>;
	sessionProposal: (callback: (proposal: WalletKitTypes.SessionProposal) => void) => void;
	sessionDelete: (callback: () => void) => void;
	sessionRequest: (callback: (request: WalletKitTypes.SessionRequest) => Promise<void>) => void;
	offSessionProposal: (callback: (proposal: WalletKitTypes.SessionProposal) => void) => void;
	offSessionDelete: (callback: () => void) => void;
	offSessionRequest: (callback: (request: WalletKitTypes.SessionRequest) => Promise<void>) => void;
	rejectRequest: (params: { id: number; topic: string; error: ErrorResponse }) => Promise<void>;
	getActiveSessions: () => Record<string, SessionTypes.Struct>;
	approveRequest: (params: {
		id: number;
		topic: string;
		message: WalletConnectApproveRequestMessage;
	}) => Promise<void>;
}

export type OptionWalletConnectListener = Option<WalletConnectListener>;
