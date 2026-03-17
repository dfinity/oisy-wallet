<script lang="ts">
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<EthFeeDisplay>
	{#snippet label()}
		{$i18n.fee.text.network_fee}
	{/snippet}
</EthFeeDisplay>
