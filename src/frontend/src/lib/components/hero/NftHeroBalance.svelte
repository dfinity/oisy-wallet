<script lang="ts">
	import { NFT_HERO_COUNT, NFT_HERO_NETWORK_COUNT } from '$lib/constants/test-ids.constants';
	import { enabledNfts } from '$lib/derived/nfts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getNftCountsByNetwork } from '$lib/utils/nfts.utils';

	const { total, byNetwork } = $derived(getNftCountsByNetwork($enabledNfts));

	const countLabel = $derived(
		replacePlaceholders(total === 1 ? $i18n.nfts.text.count_one : $i18n.nfts.text.count_other, {
			$count: String(total)
		})
	);
</script>

<span class="flex flex-col items-center gap-4">
	<output
		class="mt-7 inline-block text-4xl font-bold break-all md:text-5xl"
		data-tid={NFT_HERO_COUNT}
	>
		{countLabel}
	</output>

	{#if byNetwork.length > 0}
		<div class="flex flex-wrap items-center justify-center gap-2">
			{#each byNetwork as { network, count } (network.id)}
				<span
					class="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold"
					data-tid={NFT_HERO_NETWORK_COUNT}
				>
					{network.name} · {count}
				</span>
			{/each}
		</div>
	{/if}
</span>
