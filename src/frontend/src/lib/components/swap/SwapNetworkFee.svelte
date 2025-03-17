<script lang="ts">
    import type {ProviderFee} from "$lib/types/swap";
    import FeeDisplay from "$lib/components/fee/FeeDisplay.svelte";
    import ModalValue from "$lib/components/ui/ModalValue.svelte";

    export let networkFee: ProviderFee;
</script>

<ModalValue>
    <svelte:fragment slot="label">Included network fees</svelte:fragment>

    <div slot="main-value" class="flex flex-col">
        <FeeDisplay
            feeAmount={networkFee.fee}
            symbol={networkFee.token.symbol}
            decimals={networkFee.token.decimals}
            displayExchangeRate={false}
        />
    </div>
</ModalValue>