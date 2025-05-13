<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	let { ariaLabel, onclick }: { ariaLabel?: string; onclick: () => void } = $props();
</script>

<ButtonIcon
	colorStyle="muted"
	link={false}
	on:click={onclick}
	ariaLabel={ariaLabel ?? $i18n.convert.text.input_reset_button}
>
	<IconClose slot="icon" size="24" />
</ButtonIcon>
