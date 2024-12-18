<script lang="ts">
	import LoaderEthBalances from '$eth/components/loaders/LoaderEthBalances.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
	import Loader from '$lib/components/loaders/Loader.svelte';
	import LoaderMetamask from '$lib/components/loaders/LoaderMetamask.svelte';
	import LoaderUserProfile from '$lib/components/loaders/LoaderUserProfile.svelte';
	import LoaderWallets from '$lib/components/loaders/LoaderWallets.svelte';
</script>

<AddressGuard>
	<Loader>
		<LoaderEthBalances>
			<LoaderWallets>
				<ExchangeWorker>
					<LoaderMetamask
						><LoaderUserProfile>
							<slot />
						</LoaderUserProfile>
					</LoaderMetamask>
				</ExchangeWorker>
			</LoaderWallets>
		</LoaderEthBalances>
	</Loader>
</AddressGuard>
