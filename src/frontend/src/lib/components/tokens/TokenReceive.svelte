<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { isNetworkIdICP } from '$lib/utils/network.utils';
	import IcReceive from '$icp/components/receive/IcReceive.svelte';
	import Receive from '$eth/components/receive/Receive.svelte';

	export let token: Token;

	let networkIcp = false;
	$: networkIcp = isNetworkIdICP(token?.network.id);
</script>

<div class="flex flex-col justify-center mr-1">
	{#if networkIcp}
		<IcReceive compact {token} />
	{:else}
		<Receive compact />
	{/if}
</div>
