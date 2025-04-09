<script lang="ts">
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import TextWithLogo from '$lib/components/ui/TextWithLogo.svelte';
	import type { Network } from '$lib/types/network';

	export let network: Network;
</script>

<TextWithLogo name={network.name}>
	<NetworkLogo slot="icon" {network} />
</TextWithLogo>
