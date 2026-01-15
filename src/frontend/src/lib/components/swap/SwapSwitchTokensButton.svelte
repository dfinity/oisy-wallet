<script lang="ts">
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { SWAP_SWITCH_TOKENS_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		disabled?: boolean;
		onTokensSwitch: () => void;
	}

	let { disabled = false, onTokensSwitch }: Props = $props();
</script>

<div
	class="absolute top-0 right-0 bottom-0 left-0 z-1 m-auto h-9 w-9 rounded-lg bg-surface shadow-sm"
>
	<Button
		ariaLabel={$i18n.swap.text.switch_tokens_button}
		colorStyle="primary"
		{disabled}
		onclick={onTokensSwitch}
		paddingSmall
		styleClass="absolute bottom-0 left-0 right-0 top-0 m-auto rounded-lg border border-solid border-secondary"
		testId={SWAP_SWITCH_TOKENS_BUTTON}
	>
		<IconArrowUpDown />
	</Button>
</div>
