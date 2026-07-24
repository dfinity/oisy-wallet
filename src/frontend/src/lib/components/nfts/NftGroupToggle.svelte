<script lang="ts">
	import {
		NFT_GROUP_TOGGLE,
		NFT_GROUP_TOGGLE_COLLECTIONS,
		NFT_GROUP_TOGGLE_UNGROUPED
	} from '$lib/constants/test-ids.constants';
	import { nftGroupByCollection } from '$lib/derived/settings.derived';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { nftGroupByCollectionStore } from '$lib/stores/settings.store';

	const setGrouping = (grouping: boolean) => {
		if (grouping === $nftGroupByCollection) {
			return;
		}

		trackEvent({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.GROUP,
				event_value: grouping ? 'collection' : 'plain_list'
			}
		});
		nftGroupByCollectionStore.set({ key: 'nft-group-by-collection', value: grouping });
	};
</script>

<div class="inline-flex gap-0.5 rounded-full bg-secondary p-1" data-tid={NFT_GROUP_TOGGLE}>
	<button
		class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
		class:bg-primary={!$nftGroupByCollection}
		class:shadow-sm={!$nftGroupByCollection}
		class:text-primary={!$nftGroupByCollection}
		class:text-secondary={$nftGroupByCollection}
		data-tid={NFT_GROUP_TOGGLE_UNGROUPED}
		onclick={() => setGrouping(false)}
		type="button"
	>
		{$i18n.nfts.text.ungrouped}
	</button>

	<button
		class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
		class:bg-primary={$nftGroupByCollection}
		class:shadow-sm={$nftGroupByCollection}
		class:text-primary={$nftGroupByCollection}
		class:text-secondary={!$nftGroupByCollection}
		data-tid={NFT_GROUP_TOGGLE_COLLECTIONS}
		onclick={() => setGrouping(true)}
		type="button"
	>
		{$i18n.nfts.text.collections}
	</button>
</div>
