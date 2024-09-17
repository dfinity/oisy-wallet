<script lang="ts">
	import LoaderBalances from '$icp-eth/components/core/LoaderBalances.svelte';
	import Loader from '$lib/components/core/Loader.svelte';
	import LoaderMetamask from '$lib/components/core/LoaderMetamask.svelte';
	import LoaderWallets from '$lib/components/core/LoaderWallets.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
	import { enabledIcTokens, enabledBtcTokens } from '$lib/derived/tokens.derived';
</script>

<AddressGuard>
	<Loader>
		<LoaderBalances>
			<LoaderWallets tokens={[...$enabledIcTokens, ...$enabledBtcTokens]}>
				<ExchangeWorker>
					<LoaderMetamask>
						<slot />
					</LoaderMetamask>
				</ExchangeWorker>
			</LoaderWallets>
		</LoaderBalances>
	</Loader>
</AddressGuard>
