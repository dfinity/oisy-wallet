<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { initMetamaskSupport } from '$eth/services/metamask.services';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// We consider Metamask a general tool for the dApp, therefore we check its availability regardless of the network
	onMount(initMetamaskSupport);
</script>

{@render children()}
