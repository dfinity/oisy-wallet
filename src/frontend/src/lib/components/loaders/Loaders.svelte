<script lang="ts">
	import LoaderBalances from '$icp-eth/components/core/LoaderBalances.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
	import Loader from '$lib/components/loaders/Loader.svelte';
	import LoaderMetamask from '$lib/components/loaders/LoaderMetamask.svelte';
	import LoaderWallets from '$lib/components/loaders/LoaderWallets.svelte';
</script>

<AddressGuard>
	<Loader>
		<LoaderBalances>
			<LoaderWallets>
				<ExchangeWorker>
					<LoaderMetamask>
						<slot />
					</LoaderMetamask>
				</ExchangeWorker>
			</LoaderWallets>
		</LoaderBalances>
	</Loader>
</AddressGuard>
