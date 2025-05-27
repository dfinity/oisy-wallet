<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';

	interface Props {
		copyAddress?: string;
		copyAddressText?: string;
		explorerUrl?: string;
		explorerUrlAriaLabel?: string;
	}

	const { copyAddress, copyAddressText, explorerUrl, explorerUrlAriaLabel }: Props = $props();
</script>

{#if nonNullish(copyAddress) && nonNullish(copyAddressText)}
	<Copy value={copyAddress} text={copyAddressText} inline />
{/if}
{#if nonNullish(explorerUrl) && nonNullish(explorerUrlAriaLabel)}
	<ExternalLink
		iconSize="18"
		href={explorerUrl}
		ariaLabel={explorerUrlAriaLabel}
		inline
		color="blue"
	/>
{/if}
