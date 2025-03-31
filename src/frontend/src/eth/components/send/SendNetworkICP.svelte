<script lang="ts">
	import { getContext } from 'svelte';
	import SendNetwork from '$eth/components/send/SendNetwork.svelte';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';

	export let network: Network | undefined = undefined;
	export let destination: string | undefined = undefined;

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let icp = false;
	$: icp = isErc20Icp($sendToken);
</script>

{#if icp}
	<SendNetwork bind:network {destination} />
{/if}
