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

	// Turns the arrow a half-turn per swap, and back the other way on the next one.
	let flipped = $state(false);

	const onclick = () => {
		flipped = !flipped;
		onTokensSwitch();
	};
</script>

<div
	class="absolute top-0 right-0 bottom-0 left-0 z-1 m-auto h-9 w-9 rounded-lg bg-surface shadow-sm"
>
	<Button
		ariaLabel={$i18n.swap.text.switch_tokens_button}
		colorStyle="primary"
		{disabled}
		{onclick}
		paddingSmall
		styleClass="absolute bottom-0 left-0 right-0 top-0 m-auto rounded-lg border border-solid border-secondary press-icon"
		testId={SWAP_SWITCH_TOKENS_BUTTON}
	>
		<span
			class="flex transition-[rotate] duration-300 ease-out motion-reduce:transition-none"
			class:rotate-180={flipped}
		>
			<IconArrowUpDown />
		</span>
	</Button>
</div>
