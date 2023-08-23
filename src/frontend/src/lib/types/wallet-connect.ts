import type { WebSocketListener } from '$lib/types/listener';
import type { PairingTypes } from '@walletconnect/types';
import type { Web3WalletTypes } from '@walletconnect/web3wallet';

export interface WalletConnectListener extends WebSocketListener {
	pair: () => Promise<PairingTypes.Struct>;
	approve: (proposal: Web3WalletTypes.SessionProposal) => Promise<void>;
	reject: (proposal: Web3WalletTypes.SessionProposal) => Promise<void>;
	sessionProposal: (callback: (proposal: Web3WalletTypes.SessionProposal) => void) => void;
}
