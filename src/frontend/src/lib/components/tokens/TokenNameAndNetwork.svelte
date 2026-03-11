<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CardData } from '$lib/types/token-card';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { getTokenDisplayName } from '$lib/utils/token.utils';

	interface Props {
		data: CardData;
	}

	let { data }: Props = $props();

	let name = $derived(getTokenDisplayName(data));

	let networkName = $derived(data.network?.name);
</script>

<span class="text-primary">{name}</span>
{#if nonNullish(networkName) && name !== networkName}
	<span class="text-tertiary">
		{replacePlaceholders($i18n.tokens.text.on_network, { $network: networkName })}
	</span>
{/if}
