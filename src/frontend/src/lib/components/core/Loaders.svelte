<script lang="ts">
	import LoaderBalances from '$icp-eth/components/core/LoaderBalances.svelte';
	import Loader from '$lib/components/core/Loader.svelte';
	import LoaderMetamask from '$lib/components/core/LoaderMetamask.svelte';
	import LoaderWallets from '$lib/components/core/LoaderWallets.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
</script>

<AddressGuard>
	<Loader>
		<LoaderBalances>
			<LoaderWallets>
				<LoaderMetamask>
					<slot />
				</LoaderMetamask>
			</LoaderWallets>
		</LoaderBalances>
	</Loader>
</AddressGuard>
