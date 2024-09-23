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

const derivedList = {
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
	const derivedChangeCounters = new Map<string, number>();

	Object.entries(derivedList).forEach(([name, derivedStore]) => {
		derivedChangeCounters.set(name, 0);
		derivedStore.subscribe(() =>
			derivedChangeCounters.set(name, (derivedChangeCounters.get(name) ?? 0) + 1)
		);
	});

	// Initialization call
	Object.entries(derivedList).forEach(([name]) => {
		const count = derivedChangeCounters.get(name);
		assert(count === 1, `${name} was called ${count} times during initialization`);
	});

	changeStore();

	await tick();

	Object.entries(derivedList).forEach(([name]) => {
		const count = derivedChangeCounters.get(name) ?? 0;
		assert(count <= 2, `${name} was called ${count} times`);
	});
};
