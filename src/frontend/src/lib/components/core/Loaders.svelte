<script lang="ts">
	import BtcLoaderWallets from '$btc/components/core/BtcLoaderWallets.svelte';
	import IcLoaderWallets from '$icp/components/core/IcLoaderWallets.svelte';
	import LoaderBalances from '$icp-eth/components/core/LoaderBalances.svelte';
	import Loader from '$lib/components/core/Loader.svelte';
	import LoaderMetamask from '$lib/components/core/LoaderMetamask.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
</script>

<AddressGuard>
	<Loader>
		<LoaderBalances>
			<IcLoaderWallets>
				<BtcLoaderWallets>
					<LoaderMetamask>
						<slot />
					</LoaderMetamask>
				</BtcLoaderWallets>
			</IcLoaderWallets>
		</LoaderBalances>
	</Loader>
</AddressGuard>
