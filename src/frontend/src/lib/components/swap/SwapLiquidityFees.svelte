<script lang="ts">
    import ModalValue from "$lib/components/ui/ModalValue.svelte";
    import type {ProviderFee} from "$lib/types/swap";
    import {allTokens} from "$lib/derived/all-tokens.derived";
    import FeeDisplay from "$lib/components/fee/FeeDisplay.svelte";

    export let liquidityFees: ProviderFee[];

    const getDecimals = (symbol: string) => $allTokens.find((token) => token.symbol === symbol)?.decimals;
</script>

<ModalValue>
    <svelte:fragment slot="label">Included liquidity pool fees</svelte:fragment>

    <div slot="main-value" class="flex flex-col">
        {#each liquidityFees as fee (fee)}
            <FeeDisplay
                feeAmount={fee.fee}
                symbol={fee.symbol}
                decimals={getDecimals(fee.symbol)}
                displayExchangeRate={false}
            />
        {/each}
    </div>
</ModalValue>