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
	}

	const {
		copyAddress,
		copyAddressText,
		copyAddressTestId,
		externalLink,
		externalLinkAriaLabel,
		externalLinkTestId
	}: Props = $props();
</script>

<span class="float-right flex pl-1.5 align-top">
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
