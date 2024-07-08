<script lang="ts">
	import LoaderBalances from '$icp-eth/components/core/LoaderBalances.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import Loader from '$lib/components/core/Loader.svelte';
	import LoaderMetamask from '$lib/components/core/LoaderMetamask.svelte';
</script>

<AddressGuard>
	<Loader>
		<LoaderBalances>
			<ExchangeWorker>
				<LoaderMetamask>
					<slot />
				</LoaderMetamask>
			</ExchangeWorker>
		</LoaderBalances>
	</Loader>
</AddressGuard>
