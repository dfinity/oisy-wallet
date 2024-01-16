<script lang="ts">
	import IcSendNetwork from './IcSendNetwork.svelte';
	import type { NetworkId } from '$lib/types/network';
	import type { IcToken } from '$icp/types/ic';
	import { isNetworkUsingCkBtcLedger } from '$icp/utils/ic-send.utils';
	import type { Token } from '$lib/types/token';

	export let token: Token;
	export let networkId: NetworkId | undefined = undefined;
	export let destination: string | undefined = undefined;

	let ckBTC = false;
	$: ckBTC = isNetworkUsingCkBtcLedger(token as IcToken);
</script>

{#if ckBTC}
	<IcSendNetwork bind:networkId bind:destination />
{/if}
