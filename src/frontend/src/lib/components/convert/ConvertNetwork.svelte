<script lang="ts">
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import type { Token } from '$lib/types/token';

	export let token: Token;
</script>

<ModalValue>
	{#snippet label()}
		<slot name="label" />
	{/snippet}

	{#snippet mainValue()}
		<div class="flex">
			<NetworkLogo color="off-white" network={token.network} />
			<span class="ml-2">{token.network.name}</span>
		</div>
	{/snippet}
</ModalValue>
