<script lang="ts">
    import ModalValue from "$lib/components/ui/ModalValue.svelte";
    import type {ProviderFee} from "$lib/types/swap";
    import FeeDisplay from "$lib/components/fee/FeeDisplay.svelte";

    export let liquidityFees: ProviderFee[];
</script>

<ModalValue labelStyleClass="self-start">
    <div slot="label">Included liquidity pool fees</div>

    <div slot="main-value" class="flex flex-col">
        {#each liquidityFees as liquidityFee}
            <FeeDisplay
                feeAmount={liquidityFee.fee}
                symbol={liquidityFee.token.symbol}
                decimals={liquidityFee.token.decimals}
                displayExchangeRate={false}
            />
        {/each}
    </div>
</ModalValue>