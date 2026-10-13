<script lang="ts">
	import { onDestroy } from 'svelte';
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import IconGixCheck from '$lib/components/icons/IconGixCheck.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import IconSwap from '$lib/components/ui/IconSwap.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ButtonColorStyle } from '$lib/types/style';
	import { copyToClipboard } from '$lib/utils/clipboard.utils';

	interface Props {
		text: string;
		value: string;
		testId?: string;
		ariaLabel?: string;
		iconSize?: string;
		colorStyle?: ButtonColorStyle;
		disabled?: boolean;
		link?: boolean;
		transparent?: boolean;
		inline?: boolean;
		/** Fired after a successful copy. */
		onCopy?: () => void;
	}

	const {
		text,
		value,
		testId,
		ariaLabel,
		iconSize,
		inline = false,
		onCopy,
		...rest
	}: Props = $props();

	const CONFIRMATION_DURATION_MS = 2000;

	let copied = $state(false);
	let resetTimeout: ReturnType<typeof setTimeout> | undefined;

	const handleClick = async (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		// Confirmed on the button itself rather than with a toast: a toast at the screen
		// edge is far from where the user tapped, and on mobile it can sit behind a sheet.
		if (!(await copyToClipboard({ value, text, withToast: false }))) {
			return;
		}

		copied = true;
		clearTimeout(resetTimeout);
		resetTimeout = setTimeout(() => (copied = false), CONFIRMATION_DURATION_MS);

		onCopy?.();
	};

	onDestroy(() => clearTimeout(resetTimeout));
</script>

<ButtonIcon
	ariaLabel={ariaLabel ?? `${$i18n.core.text.copy}: ${value}`}
	height={inline ? 'h-6' : undefined}
	onclick={handleClick}
	styleClass={`${inline ? 'inline-block align-sub' : 'flex'}`}
	{testId}
	width={inline ? 'w-6' : undefined}
	{...rest}
>
	{#snippet icon()}
		<IconSwap swapped={copied}>
			{#snippet icon()}
				<IconCopy size={iconSize} />
			{/snippet}
			{#snippet swappedIcon()}
				<span class="text-success-primary"><IconGixCheck size={iconSize} /></span>
			{/snippet}
		</IconSwap>
	{/snippet}
</ButtonIcon>
<span class="sr-only" aria-live="polite" role="status">{copied ? text : ''}</span>
