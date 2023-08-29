<script lang="ts">
    import Card from '$lib/components/ui/Card.svelte';
    import IconETHQRCode from "$lib/components/icons/IconETHQRCode.svelte";
    import {formatEtherShort} from "$lib/utils/format.utils";
    import {balanceStore} from "$lib/stores/balance.store";
    import {BigNumber} from "alchemy-sdk";
    import {CURRENCY_SYMBOL} from "$lib/constants/eth.constants";
</script>

<Card>
    Ethereum

    <IconETHQRCode slot="icon" />

    <div class="font-normal break-words" slot="description">
        {formatEtherShort($balanceStore ?? BigNumber.from(0n))}
        {CURRENCY_SYMBOL}
    </div>
</Card>