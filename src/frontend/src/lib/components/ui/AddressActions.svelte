<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';

	interface Props {
		copyAddress?: string;
		copyAddressText?: string;
		copyAddressTestId?: string;
		externalLink?: string;
		externalLinkAriaLabel?: string;
		externalLinkTestId?: string;
		// Floated by default, which pins the controls to the far edge of a list row. Inline keeps
		// them beside the address they act on.
		inline?: boolean;
	}

	const {
		copyAddress,
		copyAddressText,
		copyAddressTestId,
		externalLink,
		externalLinkAriaLabel,
		externalLinkTestId,
		inline = false
	}: Props = $props();
</script>

<span class="flex pl-1.5 align-top" class:float-right={!inline} class:inline-flex={inline}>
	{#if nonNullish(copyAddress) && nonNullish(copyAddressText)}
		<Copy inline testId={copyAddressTestId} text={copyAddressText} value={copyAddress} />
	{/if}
	{#if nonNullish(externalLink) && nonNullish(externalLinkAriaLabel)}
		<ExternalLink
			ariaLabel={externalLinkAriaLabel}
			href={externalLink}
			iconSize="18"
			testId={externalLinkTestId}
		/>
	{/if}
</span>
