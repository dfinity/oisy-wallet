<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let address: string;
	export let explorerUrl: string | undefined;
	export let copiedText: string;
</script>

<output>{address}</output>

<Copy value={address} text={copiedText} inline />

{#if nonNullish(explorerUrl)}
	<ExternalLink
		iconSize="18"
		href={explorerUrl}
		ariaLabel={$i18n.transaction.alt.open_to_block_explorer}
		inline
		color="blue"
	/>
{/if}
