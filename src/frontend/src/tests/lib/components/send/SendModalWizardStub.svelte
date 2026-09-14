<!-- Stubs the chain-specific `SendWizard` when unit-testing `SendModal`'s amount handling. -->
<script lang="ts">
	import type { ProgressStepsSend } from '$lib/enums/progress-steps';

	interface Props {
		amount?: number;
		sendProgressStep: ProgressStepsSend;
		onSendBack: () => void;
		onTokensList: () => void;
	}

	let {
		amount = $bindable(),
		sendProgressStep = $bindable(),
		onSendBack,
		onTokensList
	}: Props = $props();
</script>

<span data-tid="stub-amount">{amount ?? ''}</span>
<span data-tid="stub-progress-step">{sendProgressStep}</span>
<button data-tid="stub-set-amount" onclick={() => (amount = 5)}>set amount</button>
<button data-tid="stub-send-back" onclick={onSendBack}>back</button>
<button data-tid="stub-to-tokens-list" onclick={onTokensList}>tokens list</button>
