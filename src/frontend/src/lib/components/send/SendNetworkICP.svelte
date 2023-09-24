<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { isErc20Icp } from '$lib/utils/token.utils';
    import SendNetwork from "$lib/components/send/SendNetwork.svelte";
    import type {TargetNetwork} from "$lib/enums/network";

	export let token: Token;
    export let network: TargetNetwork | undefined = undefined;
    export let destination: string | undefined = undefined;

	let icp = false;
	$: icp = isErc20Icp(token);
</script>

{#if icp}
    <SendNetwork bind:network bind:destination />
{/if}
