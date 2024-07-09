<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { isNetworkIdICP } from '$lib/utils/network.utils';
	import IcReceive from '$icp/components/receive/IcReceive.svelte';
	import EthReceive from '$eth/components/receive/EthReceive.svelte';
	import Send from '$eth/components/send/Send.svelte';
	import IcSend from '$icp/components/send/IcSend.svelte';
	import { runAndResetToken } from '$icp/services/token.services';
	import { modalStore } from '$lib/stores/modal.store';

	export let token: Token;

	let networkIcp = false;
	$: networkIcp = isNetworkIdICP(token?.network.id);

	const close = () => runAndResetToken(modalStore.close);
</script>

<div class="flex justify-center gap-1 mr-[-0.45rem]">
	{#if networkIcp}
		<IcReceive compact {token} on:nnsClose={close} />
		<IcSend compact {token} on:nnsClose={close} />
	{:else}
		<EthReceive compact />
		<Send compact {token} on:nnsClose={close} />
	{/if}
</div>
