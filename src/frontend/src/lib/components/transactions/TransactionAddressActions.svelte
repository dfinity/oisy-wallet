<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';

	interface Props {
		copyAddress?: string;
		copyAddressText?: string;
		copyAddressTestId?: string;
		explorerUrl?: string;
		explorerUrlAriaLabel?: string;
		explorerUrlTestId?: string;
	}

	const {
		copyAddress,
		copyAddressText,
		copyAddressTestId,
		explorerUrl,
		explorerUrlAriaLabel,
		explorerUrlTestId
	}: Props = $props();
</script>

<span class="float-right flex pl-1.5 align-top">
	{#if nonNullish(copyAddress) && nonNullish(copyAddressText)}
		<Copy value={copyAddress} text={copyAddressText} inline testId={copyAddressTestId} />
	{/if}
	{#if nonNullish(explorerUrl) && nonNullish(explorerUrlAriaLabel)}
		<ExternalLink
			iconSize="18"
			href={explorerUrl}
			ariaLabel={explorerUrlAriaLabel}
			testId={explorerUrlTestId}
		/>
	{/if}
</span>
