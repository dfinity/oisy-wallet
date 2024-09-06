<script lang="ts">
	import IcLoaderWallets from '$icp/components/core/IcLoaderWallets.svelte';
	import LoaderBalances from '$icp-eth/components/core/LoaderBalances.svelte';
	import Loader from '$lib/components/core/Loader.svelte';
	import LoaderMetamask from '$lib/components/core/LoaderMetamask.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
</script>

<AddressGuard>
	<Loader>
		<LoaderBalances>
			<IcLoaderWallets>
				<ExchangeWorker>
					<LoaderMetamask>
						<slot />
					</LoaderMetamask>
				</ExchangeWorker>
			</IcLoaderWallets>
		</LoaderBalances>
	</Loader>
</AddressGuard>
