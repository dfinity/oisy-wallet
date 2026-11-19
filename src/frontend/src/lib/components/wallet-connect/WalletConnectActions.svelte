<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		approve?: boolean;
		approveDisabled?: boolean;
		onApprove: () => void;
		onReject: () => void;
	}

	let { approve = true, approveDisabled = false, onApprove, onReject }: Props = $props();
</script>

<ButtonGroup>
	<Button colorStyle="error" disabled={$isBusy} onclick={onReject}>{$i18n.core.text.reject}</Button>

	{#if approve}
		<Button colorStyle="success" disabled={$isBusy || approveDisabled} onclick={onApprove}>
			{$i18n.core.text.approve}
		</Button>
	{/if}
</ButtonGroup>
