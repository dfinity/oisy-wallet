<script lang="ts">
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { tokenDecimals } from '$lib/derived/token.derived';

	export let amount: number | undefined = undefined;
	export let amountError: IcAmountAssertionError | undefined;
</script>

<SendInputAmount bind:amount tokenDecimals={$tokenDecimals} bind:error={amountError} />
