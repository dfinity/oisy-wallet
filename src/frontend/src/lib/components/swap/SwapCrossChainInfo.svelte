<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';



	const { sourceToken, destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);
</script>

{#if nonNullish($destinationToken) && nonNullish($sourceToken) && $sourceToken.network.id !== $destinationToken.network.id}


	<MessageBox styleClass="sm:text-sm">
		<Html
			text={replacePlaceholders($i18n.swap.text.cross_chain_networks_info, {
				$sourceNetwork: $sourceToken.network.name,
				$destinationNetwork: $destinationToken.network.name
			})}
		/>
	</MessageBox>
{/if}
