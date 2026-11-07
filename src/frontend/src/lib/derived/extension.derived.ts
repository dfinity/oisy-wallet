import { ethAddress, solAddressDevnet } from '$lib/derived/address.derived';
import { networkSepoliaEnabled, networkSolanaDevnetEnabled } from '$lib/derived/networks.derived';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import type { ExtensionAccount } from '$lib/types/extension';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

// The extension works on Sepolia and Solana Devnet only. OISY loads the devnet address, and the
// review screens accept those networks, only while they are switched on; the testnets toggle alone
// is not enough.
export const extensionNetworksOn: Readable<boolean> = derived(
	[testnetsEnabled, networkSepoliaEnabled, networkSolanaDevnetEnabled],
	([$testnetsEnabled, $networkSepoliaEnabled, $networkSolanaDevnetEnabled]) =>
		$testnetsEnabled && $networkSepoliaEnabled && $networkSolanaDevnetEnabled
);

// The addresses the extension keeps and shares with connected sites.
export const extensionAccount: Readable<ExtensionAccount | undefined> = derived(
	[extensionNetworksOn, ethAddress, solAddressDevnet],
	([$extensionNetworksOn, $ethAddress, $solAddressDevnet]) =>
		$extensionNetworksOn && nonNullish($ethAddress) && nonNullish($solAddressDevnet)
			? { eth: $ethAddress, sol: $solAddressDevnet }
			: undefined
);
