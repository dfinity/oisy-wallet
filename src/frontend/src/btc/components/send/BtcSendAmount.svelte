<script lang="ts">
	import type { BtcAmountAssertionError } from '$btc/types/btc-send';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { tokenDecimals } from '$lib/derived/token.derived';

	export let amount: number | undefined = undefined;
	export let amountError: BtcAmountAssertionError | undefined;
</script>

<SendInputAmount bind:amount tokenDecimals={$tokenDecimals} bind:error={amountError} />
