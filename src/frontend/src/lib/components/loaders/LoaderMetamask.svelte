<script lang="ts">
	import { onMount } from 'svelte';
	import { initMetamaskSupport } from '$eth/services/metamask.services';

	// We consider Metamask a general tool for the dApp, therefore we check its availability regardless of the network
	onMount(initMetamaskSupport);
</script>
