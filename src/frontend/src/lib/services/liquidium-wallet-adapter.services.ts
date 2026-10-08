import { signMessage } from '$lib/api/signer.api';
import type { Identity } from '@icp-sdk/core/agent';
import { Chain, type SignMessageRequest, type WalletAdapter } from '@liquidium/client';
import { hexlify, toUtf8Bytes } from 'ethers/utils';

// Liquidium signer bridge. Only `signMessage` is implemented: profiles are
// ETH-owned because oisy can sign arbitrary messages only on the ETH key
// (EIP-191; no BIP-322 for BTC), and supply broadcasts the transfer itself, so
// the adapter's send/PSBT methods aren't needed.
export const liquidiumWalletAdapter = ({ identity }: { identity: Identity }): WalletAdapter => ({
	signMessage: async ({ chain, message }: SignMessageRequest): Promise<string> => {
		if (chain !== Chain.ETH) {
			throw new Error(`Liquidium signMessage requested for unsupported chain: ${chain}`);
		}

		// `eth_personal_sign` expects hex; the SDK gives plain UTF-8, so hex-encode its bytes.
		return await signMessage({ identity, message: hexlify(toUtf8Bytes(message)) });
	}
});
