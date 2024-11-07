<script lang="ts">
	import LoaderBalances from '$icp-eth/components/core/LoaderBalances.svelte';
	import Loader from '$lib/components/core/Loader.svelte';
	import LoaderMetamask from '$lib/components/core/LoaderMetamask.svelte';
	import LoaderWallets from '$lib/components/core/LoaderWallets.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';

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
