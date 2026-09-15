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

	// Mirrors `TokenInputContent.onInput`, which the button does not render itself: typing sets
	// the amount and clears the flag.
	const simulateInput = () => {
		amount = '0.002';
		amountSetToMax = false;
	};
</script>

<MaxBalanceButton {balance} {fee} {maxAmount} {token} bind:amount bind:amountSetToMax />

<span data-tid="max-balance-button-amount">{amount ?? ''}</span>
<span data-tid="max-balance-button-amount-set-to-max">{amountSetToMax.toString()}</span>
<button data-tid="max-balance-button-simulate-input" onclick={simulateInput}>input</button>
