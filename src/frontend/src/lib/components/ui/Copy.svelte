<script lang="ts">
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ButtonColorStyle } from '$lib/types/style';
	import { copyToClipboard } from '$lib/utils/clipboard.utils';

	interface Props {
		text: string;
		value: string;
		testId?: string;
		colorStyle?: ButtonColorStyle;
		disabled?: boolean;
		link?: boolean;
		transparent?: boolean;
		inline?: boolean;
		// Render the confirmation toast above overlays (e.g. copying from within a
		// bottom sheet). See ToastMsg `overlay`.
		overlay?: boolean;
	}

	const { text, value, testId, inline = false, overlay = false, ...rest }: Props = $props();

	const handleClick = async (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		await copyToClipboard({ value, text, overlay });
	};
</script>

<ButtonIcon
	ariaLabel={`${$i18n.core.text.copy}: ${value}`}
	height={inline ? 'h-6' : undefined}
	onclick={handleClick}
	styleClass={`${inline ? 'inline-block align-sub' : 'flex'}`}
	{testId}
	width={inline ? 'w-6' : undefined}
	{...rest}
>
	{#snippet icon()}
		<IconCopy />
	{/snippet}
</ButtonIcon>
