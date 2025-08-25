import { tokenWithFallbackAsIcToken } from '$icp/derived/ic-token.derived';
import {
	btcAddressMainnet,
	btcAddressTestnet,
	ethAddress,
	ethAddressCertified,
	ethAddressNotCertified,
	ethAddressNotLoaded
} from '$lib/derived/address.derived';
import { authIdentity, authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
import { balance, balanceZero } from '$lib/derived/balances.derived';
import { isBusy } from '$lib/derived/busy.derived';
import { exchangeInitialized, exchanges } from '$lib/derived/exchange.derived';
import { userHasPouhCredential } from '$lib/derived/has-pouh-credential';
import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
import {
	combinedDerivedSortedNetworkTokens,
	combinedDerivedSortedNetworkTokensUi
} from '$lib/derived/network-tokens.derived';
import {
	networkAddress,
	networkBitcoin,
	networkEthereum,
	networkICP,
	networkId,
	pseudoNetworkChainFusion,
	selectedNetwork
} from '$lib/derived/network.derived';
import { networks, networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
import { pageToken } from '$lib/derived/page-token.derived';
import { hideZeroBalances, showZeroBalances, testnetsEnabled } from '$lib/derived/settings.derived';
import { testnets } from '$lib/derived/testnets.derived';
import {
	tokenDecimals,
	tokenId,
	tokenStandard,
	tokenSymbol,
	tokenToggleable,
	tokenWithFallback
} from '$lib/derived/token.derived';
import {
	enabledErc20Tokens,
	enabledIcTokens,
	enabledMainnetTokensUsdBalancesPerNetwork,
	enabledTokens,
	tokens,
	tokensToPin
} from '$lib/derived/tokens.derived';
import { tick } from 'svelte';
import type { Readable, Unsubscriber } from 'svelte/store';
import type { MockInstance } from 'vitest';

const derivedList: Record<string, Readable<unknown>> = {
	authIdentity,
	authNotSignedIn,
	authSignedIn,
	balance,
	balanceZero,
	btcAddressMainnet,
	btcAddressTestnet,
	combinedDerivedSortedNetworkTokens,
	combinedDerivedSortedNetworkTokensUi,
	enabledErc20Tokens,
	enabledIcTokens,
	enabledMainnetTokensUsdBalancesPerNetwork,
	enabledTokens,
	exchangeInitialized,
	exchanges,
	ethAddress,
	ethAddressCertified,
	ethAddressNotCertified,
	ethAddressNotLoaded,
	hideZeroBalances,
	isBusy,
	networkAddress,
	networkBitcoin,
	networkEthereum,
	networkICP,
	networkId,
	networks,
	networksMainnets,
	networksTestnets,
	pageToken,
	pseudoNetworkChainFusion,
	routeNetwork,
	routeToken,
	selectedNetwork,
	showZeroBalances,
	testnets,
	testnetsEnabled,
	tokenDecimals,
	tokenId,
	tokenStandard,
	tokenSymbol,
	tokenToggleable,
	tokenWithFallback,
	tokenWithFallbackAsIcToken,
	tokens,
	tokensToPin,
	userHasPouhCredential
};

export const testDerivedUpdates = async (changeStore: () => void) => {
	const { derivedMocks, unsubscribers } = Object.entries(derivedList).reduce<{
		derivedMocks: MockInstance[];
		unsubscribers: Unsubscriber[];
	}>(
		({ derivedMocks, unsubscribers }, [key, derivedStore]) => {
			const mockFn = vi.fn().mockName(key);
			return {
				derivedMocks: [...derivedMocks, mockFn],
				unsubscribers: [...unsubscribers, derivedStore.subscribe(mockFn)]
			};
		},
		{ derivedMocks: [], unsubscribers: [] }
	);

	try {
		// Initialization call
		derivedMocks.forEach((mockFn) => expect(mockFn).toHaveBeenCalledTimes(1));

		changeStore();

		await tick();

		derivedMocks.forEach((mockFn) => {
			const callCount = mockFn.mock.calls.length;
			assert(callCount <= 2, `${mockFn.getMockName()} was called ${callCount} times`);
		});
	} finally {
		unsubscribers.forEach((unsub) => unsub());
	}
};
