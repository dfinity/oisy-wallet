<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { SWAP_SWITCH_TOKENS_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	export let disabled = false;
	const dispatch = createEventDispatcher();
</script>

<div class="absolute bottom-0 left-0 right-0 top-0 m-auto h-9 w-9 rounded-lg bg-surface shadow-sm z-1">
	<Button
		onclick={() => dispatch('icSwitchTokens')}
		colorStyle="primary"
		{disabled}
		ariaLabel={$i18n.swap.text.switch_tokens_button}
		styleClass="absolute bottom-0 left-0 right-0 top-0 m-auto rounded-lg border border-solid border-secondary"
		paddingSmall
		testId={SWAP_SWITCH_TOKENS_BUTTON}
	>
		<IconArrowUpDown />
	</Button>
</div>
