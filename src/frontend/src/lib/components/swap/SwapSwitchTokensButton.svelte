<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	const dispatch = createEventDispatcher();
</script>

<Button
	on:click={() => dispatch('icSwitchTokens')}
	colorStyle="tertiary"
	ariaLabel={$i18n.swap.text.switch_tokens_button}
	styleClass="absolute bottom-0 left-0 right-0 top-0 m-auto h-9 w-9 rounded-lg border border-solid border-secondary shadow"
	paddingSmall
>
	<IconArrowUpDown />
</Button>
