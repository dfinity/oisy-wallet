<script lang="ts">
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { copyToClipboard } from '$lib/utils/clipboard.utils';

	interface Props {
		address: string;
		copyAriaLabel: string;
		testId?: string;
		/** Fired after a successful copy, for callers that want to know it happened. */
		onCopy?: () => void;
	}

	let { address, copyAriaLabel, testId, onCopy }: Props = $props();
</script>

<ButtonIcon
	ariaLabel={copyAriaLabel}
	link={false}
	onclick={async () => {
		await copyToClipboard({ value: address, text: copyAriaLabel });

		onCopy?.();
	}}
	{testId}
>
	{#snippet icon()}
		<IconCopy size="24" />
	{/snippet}
</ButtonIcon>
