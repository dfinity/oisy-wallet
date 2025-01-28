<script lang="ts">
	import LoaderEthBalances from '$eth/components/loaders/LoaderEthBalances.svelte';
	import CkBTCUpdateBalanceListener from '$icp/components/core/CkBTCUpdateBalanceListener.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
	import RewardGuard from '$lib/components/guard/RewardGuard.svelte';
	import Loader from '$lib/components/loaders/Loader.svelte';
	import LoaderMetamask from '$lib/components/loaders/LoaderMetamask.svelte';
	import LoaderUserProfile from '$lib/components/loaders/LoaderUserProfile.svelte';
	import LoaderWallets from '$lib/components/loaders/LoaderWallets.svelte';
</script>

<AddressGuard>
	<Loader>
		<RewardGuard>
			<LoaderEthBalances>
				<LoaderWallets>
					<CkBTCUpdateBalanceListener>
						<ExchangeWorker>
							<LoaderMetamask
								><LoaderUserProfile>
									<slot />
								</LoaderUserProfile>
							</LoaderMetamask>
						</ExchangeWorker>
					</CkBTCUpdateBalanceListener>
				</LoaderWallets>
			</LoaderEthBalances>
		</RewardGuard>
	</Loader>
</AddressGuard>
