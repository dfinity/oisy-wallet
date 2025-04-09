<script lang="ts">
	import type { Network } from '$lib/types/network';
	import TextWithLogo from '$lib/components/ui/TextWithLogo.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';

	export let network: Network;
</script>

<TextWithLogo name={network.name}>
	<NetworkLogo slot="icon" {network} />
</TextWithLogo>
