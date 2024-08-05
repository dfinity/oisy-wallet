<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { isNetworkIdICP } from '$lib/utils/network.utils';
	import IcReceive from '$icp/components/receive/IcReceive.svelte';
	import EthReceive from '$eth/components/receive/EthReceive.svelte';
	import EthSend from '$eth/components/send/EthSend.svelte';
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
		<IcReceive {token} on:nnsClose={close} />
		<IcSend {token} on:nnsClose={close} />
	{:else}
		<EthReceive />
		<EthSend {token} on:nnsClose={close} />
	{/if}
</div>
