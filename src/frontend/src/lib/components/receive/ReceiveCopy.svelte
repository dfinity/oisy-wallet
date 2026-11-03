<script lang="ts">
	import Copy from '$lib/components/ui/Copy.svelte';

	interface Props {
		address: string;
		copyAriaLabel: string;
		/** Confirmation once copied; defaults to `copyAriaLabel`. */
		copiedText?: string;
		testId?: string;
		/** Fired after a successful copy, for callers that want to know it happened. */
		onCopy?: () => void;
	}

	let { address, copyAriaLabel, copiedText, testId, onCopy }: Props = $props();
</script>

<Copy
	ariaLabel={copyAriaLabel}
	iconSize="24"
	link={false}
	{onCopy}
	{testId}
	text={copiedText ?? copyAriaLabel}
	value={address}
/>
