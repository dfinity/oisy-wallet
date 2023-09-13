import type { WebSocketListener } from '$lib/types/listener';
import type { ErrorResponse } from '@walletconnect/jsonrpc-utils';
import type { PairingTypes } from '@walletconnect/types';
import type { Web3WalletTypes } from '@walletconnect/web3wallet';
import type { TypedDataDomain, TypedDataField } from 'ethers';

export interface WalletConnectListener extends WebSocketListener {
	pair: () => Promise<PairingTypes.Struct>;
	approveSession: (proposal: Web3WalletTypes.SessionProposal) => Promise<void>;
	rejectSession: (proposal: Web3WalletTypes.SessionProposal) => Promise<void>;
	sessionProposal: (callback: (proposal: Web3WalletTypes.SessionProposal) => void) => void;
	sessionDelete: (callback: () => void) => void;
	sessionRequest: (callback: (request: Web3WalletTypes.SessionRequest) => Promise<void>) => void;
	rejectRequest: (params: { id: number; topic: string; error: ErrorResponse }) => Promise<void>;
	approveRequest: (params: { id: number; topic: string; message: string }) => Promise<void>;
}

export interface WalletConnectEthSendTransactionParams {
	from: string;
	to?: string;
	data: string;
	gasPrice?: string;
	gasLimit?: string;
	value?: string;
	nonce?: string;
}

export interface WalletConnectEthSignTypedDataV4 {
	domain: TypedDataDomain;
	types: Record<string, Array<TypedDataField>>;
	message: Record<string, unknown>;
	primaryType: string;
}
