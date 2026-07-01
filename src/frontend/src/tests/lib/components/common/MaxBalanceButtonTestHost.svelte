<script lang="ts">
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';

	interface Props {
		balance: OptionBalance;
		token: Token;
		fee?: bigint;
		maxAmount?: bigint;
	}

	let { balance, token, fee, maxAmount }: Props = $props();

	let amount = $state<OptionAmount>(undefined);
	let amountSetToMax = $state(false);
</script>

<MaxBalanceButton {balance} {fee} {maxAmount} {token} bind:amount bind:amountSetToMax />

<span data-tid="max-balance-button-amount">{amount ?? ''}</span>
<span data-tid="max-balance-button-amount-set-to-max">{amountSetToMax.toString()}</span>
