<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import SendNetwork from './SendNetwork.svelte';
	import type { Network } from '$lib/types/network';

	export let token: Token;
	export let network: Network | undefined = undefined;
	export let destination: string | undefined = undefined;

	let icp = false;
	$: icp = isErc20Icp(token);
</script>

{#if icp}
	<SendNetwork bind:network {destination} />
{/if}
