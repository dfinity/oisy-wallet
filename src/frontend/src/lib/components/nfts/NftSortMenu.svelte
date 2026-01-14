<script lang="ts">
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ListItemButton from '$lib/components/common/ListItemButton.svelte';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import { nftSortType, nftSortOrder } from '$lib/derived/settings.derived';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { type NftSortingType, nftSortStore } from '$lib/stores/settings.store';

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

	const setSorting = (sort: NftSortingType) => {
		nftSortStore.set({ key: 'nft-sort', value: sort });
	};

	const trackSortingEvent = ({ type, order }: { type: string; order: string }) => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_key:
					order === 'asc'
						? PLAUSIBLE_EVENT_EVENTS_KEYS.SORT_ASC
						: PLAUSIBLE_EVENT_EVENTS_KEYS.SORT_DESC,
				event_value: type
			}
		});
	};
</script>

<ButtonIcon
	ariaLabel={$i18n.navigation.alt.menu}
	colorStyle="muted"
	link={false}
	onclick={() => (visible = true)}
	styleClass={visible ? 'active' : ''}
	bind:button
>
	{#snippet icon()}
		<IconArrowUpDown />
	{/snippet}
</ButtonIcon>

<ResponsivePopover {button} bind:visible>
	{#snippet content()}
		<span class="mb-2 flex text-sm font-bold">{$i18n.nfts.text.sorting}</span>

		<List noPadding>
			<ListItem>
				<ListItemButton
					onclick={() => {
						trackSortingEvent({ order: 'desc', type: 'date' });
						setSorting({ order: 'desc', type: 'date' });
					}}
					selectable
					selected={$nftSortType === 'date' && $nftSortOrder === 'desc'}
				>
					{$i18n.nfts.text.recents_first}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => {
						trackSortingEvent({ order: 'asc', type: 'date' });
						setSorting({ order: 'asc', type: 'date' });
					}}
					selectable
					selected={$nftSortType === 'date' && $nftSortOrder === 'asc'}
				>
					{$i18n.nfts.text.oldest_first}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => {
						trackSortingEvent({ order: 'asc', type: 'collection-name' });
						setSorting({ order: 'asc', type: 'collection-name' });
					}}
					selectable
					selected={$nftSortType === 'collection-name' && $nftSortOrder === 'asc'}
				>
					{$i18n.nfts.text.collection_atoz}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => {
						trackSortingEvent({ order: 'desc', type: 'collection-name' });
						setSorting({ order: 'desc', type: 'collection-name' });
					}}
					selectable
					selected={$nftSortType === 'collection-name' && $nftSortOrder === 'desc'}
				>
					{$i18n.nfts.text.collection_ztoa}
				</ListItemButton>
			</ListItem>
		</List>
	{/snippet}
</ResponsivePopover>
