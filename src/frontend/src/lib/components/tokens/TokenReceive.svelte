<script lang="ts">
    import type {Token} from "$lib/types/token";
    import {isNetworkIdICP} from "$lib/utils/network.utils";
    import IcReceive from "$icp/components/receive/IcReceive.svelte";
    import Receive from "$eth/components/receive/Receive.svelte";

    export let token: Token;

    let networkIcp = false;
    $: networkIcp = isNetworkIdICP(token?.id);
</script>

{#if networkIcp}
    <IcReceive token={token} />
{:else}
    <Receive />
{/if}