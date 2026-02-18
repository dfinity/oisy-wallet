<script lang="ts">
	import type { Snippet } from 'svelte';
	import LoaderEthBalances from '$eth/components/loaders/LoaderEthBalances.svelte';
	import LoaderEthTransactions from '$eth/components/loaders/LoaderEthTransactions.svelte';
	import CkBtcUpdateBalanceListener from '$icp/components/core/CkBtcUpdateBalanceListener.svelte';
	import BalancesIdbSetter from '$lib/components/balances/BalancesIdbSetter.svelte';
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import StakeContext from '$lib/components/earning/StakeContext.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import Guards from '$lib/components/guard/Guards.svelte';
	import Loader from '$lib/components/loaders/Loader.svelte';
	import LoaderContacts from '$lib/components/loaders/LoaderContacts.svelte';
	import LoaderHarvest from '$lib/components/loaders/LoaderHarvest.svelte';
	import LoaderMetamask from '$lib/components/loaders/LoaderMetamask.svelte';
	import LoaderTokens from '$lib/components/loaders/LoaderTokens.svelte';
	import LoaderUserProfile from '$lib/components/loaders/LoaderUserProfile.svelte';
	import LoaderWallets from '$lib/components/loaders/LoaderWallets.svelte';
	import PowProtector from '$lib/components/pow/PowProtector.svelte';
	import UserSnapshotWorker from '$lib/components/rewards/UserSnapshotWorker.svelte';
	import TransactionsIdbSetter from '$lib/components/transactions/TransactionsIdbSetter.svelte';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<LoaderUserProfile>
	<PowProtector>
		<Loader>
			<LoaderTokens>
				<LoaderEthBalances>
					<MultipleListeners tokens={$enabledFungibleNetworkTokens}>
						<LoaderEthTransactions>
							<LoaderWallets>
								<ExchangeWorker>
									<LoaderMetamask>
										<UserSnapshotWorker>
											<LoaderContacts>
												<TransactionsIdbSetter>
													<BalancesIdbSetter>
														<LoaderHarvest>
															<StakeContext>
																{@render children()}
															</StakeContext>
														</LoaderHarvest>
													</BalancesIdbSetter>
												</TransactionsIdbSetter>
											</LoaderContacts>
										</UserSnapshotWorker>
									</LoaderMetamask>
								</ExchangeWorker>
							</LoaderWallets>
						</LoaderEthTransactions>
					</MultipleListeners>
				</LoaderEthBalances>
			</LoaderTokens>
		</Loader>
	</PowProtector>
</LoaderUserProfile>

<Guards />

<!-- This listener is kept outside of the Loaders tree to prevent slow page loading on localhost/e2e -->
<CkBtcUpdateBalanceListener />
