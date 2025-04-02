<script lang="ts">
	import LoaderEthBalances from '$eth/components/loaders/LoaderEthBalances.svelte';
	import CkBTCUpdateBalanceListener from '$icp/components/core/CkBTCUpdateBalanceListener.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
	import RewardGuard from '$lib/components/guard/RewardGuard.svelte';
	import UrlGuard from '$lib/components/guard/UrlGuard.svelte';
	import Loader from '$lib/components/loaders/Loader.svelte';
	import LoaderMetamask from '$lib/components/loaders/LoaderMetamask.svelte';
	import LoaderUserProfile from '$lib/components/loaders/LoaderUserProfile.svelte';
	import LoaderWallets from '$lib/components/loaders/LoaderWallets.svelte';
	import UserSnapshotWorker from '$lib/components/rewards/UserSnapshotWorker.svelte';
</script>

<LoaderUserProfile>
	<AddressGuard>
		<Loader>
			<UrlGuard>
				<RewardGuard>
					<LoaderEthBalances>
						<LoaderWallets>
							<ExchangeWorker>
								<LoaderMetamask>
									<UserSnapshotWorker>
										<slot />
									</UserSnapshotWorker>
								</LoaderMetamask>
							</ExchangeWorker>
						</LoaderWallets>
					</LoaderEthBalances>
				</RewardGuard>
			</UrlGuard>
		</Loader>
	</AddressGuard>
</LoaderUserProfile>

<!-- This listener is kept outside of the Loaders tree to prevent slow page loading on localhost/e2e -->
<CkBTCUpdateBalanceListener />
