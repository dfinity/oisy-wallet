<script lang="ts">
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import TextWithLogo from '$lib/components/ui/TextWithLogo.svelte';
	import type { Network } from '$lib/types/network';

	interface Props {
		network: Network;
		logo?: 'start' | 'end';
	}

	const { network, logo = 'end' }: Props = $props();
</script>

<TextWithLogo name={network.name} {logo}>
	{#snippet icon()}
		<NetworkLogo {network} />
	{/snippet}
</TextWithLogo>
