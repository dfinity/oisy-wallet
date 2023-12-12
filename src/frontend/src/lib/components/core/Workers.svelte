<script lang="ts">
	import AirdropWorker from '$lib/components/airdrop/AirdropWorker.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
</script>

<AirdropWorker>
	<ExchangeWorker>
		<slot />
	</ExchangeWorker>
</AirdropWorker>
