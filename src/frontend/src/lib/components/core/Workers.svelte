<script lang="ts">
	import AirdropWorker from '$lib/components/airdrop/AirdropWorker.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import IcpWalletWorker from '$lib/components/icp/IcpWalletWorker.svelte';
</script>

<AirdropWorker>
	<IcpWalletWorker>
		<ExchangeWorker>
			<slot />
		</ExchangeWorker>
	</IcpWalletWorker>
</AirdropWorker>
