<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { isNetworkIdICP } from '$lib/utils/network.utils';
	import IcReceive from '$icp/components/receive/IcReceive.svelte';
	import Receive from '$eth/components/receive/Receive.svelte';
	import Send from '$eth/components/send/Send.svelte';
	import IcSend from '$icp/components/send/IcSend.svelte';
	import { runAndResetToken } from '$icp/services/token.services';
	import { modalStore } from '$lib/stores/modal.store';

	export let token: Token;

	let networkIcp = false;
	$: networkIcp = isNetworkIdICP(token?.network.id);

	const close = () => runAndResetToken(modalStore.close);
</script>

<div class="flex justify-center mr-1">
	{#if networkIcp}
		<IcReceive compact {token} on:nnsClose={close} />
		<IcSend compact {token} />
	{:else}
		<Receive compact />
		<Send compact {token} on:nnsClose={close} />
	{/if}
</div>
