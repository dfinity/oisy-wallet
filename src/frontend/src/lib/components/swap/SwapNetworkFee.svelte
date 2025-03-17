<script lang="ts">
    import type {ProviderFee} from "$lib/types/swap";
    import {allTokens} from "$lib/derived/all-tokens.derived";
    import FeeDisplay from "$lib/components/fee/FeeDisplay.svelte";
    import ModalValue from "$lib/components/ui/ModalValue.svelte";

    export let networkFee: ProviderFee;

    const getDecimals = (symbol: string) => $allTokens.find((token) => token.symbol === symbol)?.decimals;
</script>

<ModalValue>
    <svelte:fragment slot="label">Included network fees</svelte:fragment>

    <div slot="main-value" class="flex flex-col">
        <FeeDisplay
            feeAmount={networkFee.fee}
            symbol={networkFee.symbol}
            decimals={getDecimals(networkFee.symbol)}
            displayExchangeRate={false}
        />
    </div>
</ModalValue>