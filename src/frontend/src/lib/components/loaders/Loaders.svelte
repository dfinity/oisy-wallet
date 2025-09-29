<script lang="ts">
	import type { Snippet } from 'svelte';
	import LoaderEthBalances from '$eth/components/loaders/LoaderEthBalances.svelte';
	import LoaderMultipleEthTransactions from '$eth/components/loaders/LoaderMultipleEthTransactions.svelte';
	import CkBtcUpdateBalanceListener from '$icp/components/core/CkBtcUpdateBalanceListener.svelte';
	import BalancesIdbSetter from '$lib/components/balances/BalancesIdbSetter.svelte';
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
	import AgreementsGuard from '$lib/components/guard/AgreementsGuard.svelte';
	import RewardGuard from '$lib/components/guard/RewardGuard.svelte';
	import ShortcutGuard from '$lib/components/guard/ShortcutGuard.svelte';
	import UrlGuard from '$lib/components/guard/UrlGuard.svelte';
	import Loader from '$lib/components/loaders/Loader.svelte';
	import LoaderContacts from '$lib/components/loaders/LoaderContacts.svelte';
	import LoaderMetamask from '$lib/components/loaders/LoaderMetamask.svelte';
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
		<AgreementsGuard>
			<AddressGuard>
				<Loader>
					<UrlGuard>
						<ShortcutGuard>
							<RewardGuard>
								<LoaderEthBalances>
									<MultipleListeners tokens={$enabledFungibleNetworkTokens}>
										<LoaderMultipleEthTransactions>
											<LoaderWallets>
												<ExchangeWorker>
													<LoaderMetamask>
														<UserSnapshotWorker>
															<LoaderContacts>
																<TransactionsIdbSetter>
																	<BalancesIdbSetter>
																		{@render children()}
																	</BalancesIdbSetter>
																</TransactionsIdbSetter>
															</LoaderContacts>
														</UserSnapshotWorker>
													</LoaderMetamask>
												</ExchangeWorker>
											</LoaderWallets>
										</LoaderMultipleEthTransactions>
									</MultipleListeners>
								</LoaderEthBalances>
							</RewardGuard>
						</ShortcutGuard>
					</UrlGuard>
				</Loader>
			</AddressGuard>
		</AgreementsGuard>
	</PowProtector>
</LoaderUserProfile>

<!-- This listener is kept outside of the Loaders tree to prevent slow page loading on localhost/e2e -->
<CkBtcUpdateBalanceListener />
