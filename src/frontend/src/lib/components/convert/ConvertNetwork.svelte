<script lang="ts">
	import type { Snippet } from 'svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import type { Token } from '$lib/types/token';

	interface Props {
		token: Token;
		label: Snippet;
	}

	let { token, label }: Props = $props();
</script>

<ModalValue {label}>
	{#snippet mainValue()}
		<div class="flex">
			<NetworkLogo color="off-white" network={token.network} />
			<span class="ml-2">{token.network.name}</span>
		</div>
	{/snippet}
</ModalValue>
