<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		ariaLabel?: string;
		onclick: () => void;
	}

	let { ariaLabel, onclick }: Props = $props();
</script>

<ButtonIcon
	ariaLabel={ariaLabel ?? $i18n.convert.text.input_reset_button}
	colorStyle="muted"
	link={false}
	{onclick}
>
	{#snippet icon()}
		<IconClose size="24" />
	{/snippet}
</ButtonIcon>
