import type { WebSocketListener } from '$lib/types/listener';
import type { PairingTypes } from '@walletconnect/types';

export interface WalletConnectListener extends WebSocketListener {
	pair: () => Promise<PairingTypes.Struct>;
}
