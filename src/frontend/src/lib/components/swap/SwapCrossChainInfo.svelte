<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	const { sourceToken, destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);
</script>

{#if nonNullish($destinationToken) && nonNullish($sourceToken) && $sourceToken.network.id !== $destinationToken.network.id}
	<div class="mt-4">
		<!-- Plain and regular weight: the amount cards already name the networks. -->
		<MessageBox level="plain" styleClass="bg-secondary! font-normal!">
			<Html
				text={replacePlaceholders($i18n.swap.text.cross_chain_networks_info, {
					$sourceNetwork: $sourceToken.network.name,
					$destinationNetwork: $destinationToken.network.name
				})}
			/>
		</MessageBox>
	</div>
{/if}
