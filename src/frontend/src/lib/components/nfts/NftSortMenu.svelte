<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { type NftListSortingType, nftListStore } from '$lib/stores/nft-list.store';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import ListItemButton from '$lib/components/common/ListItemButton.svelte';

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

	const setSorting = (sort: NftListSortingType) => {
		nftListStore.setSort(sort);
	};
</script>

<ButtonIcon
	bind:button
	onclick={() => (visible = true)}
	ariaLabel={$i18n.navigation.alt.menu}
	disabled={$erc20UserTokensNotInitialized}
	link={false}
	colorStyle="muted"
	styleClass={visible ? 'active' : ''}
>
	{#snippet icon()}
		<IconArrowUpDown />
	{/snippet}
</ButtonIcon>

<ResponsivePopover bind:visible {button}>
	{#snippet content()}
		<span class="mb-2 flex text-sm font-bold">{$i18n.nfts.text.sorting}</span>

		<List noPadding>
			<ListItem>
				<ListItemButton
					onclick={() => setSorting({ order: 'asc', type: 'date' })}
					selectable
					selected={$nftListStore.sort.type === 'date' && $nftListStore.sort.order === 'asc'}
				>
					{$i18n.nfts.text.recents_first}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => setSorting({ order: 'desc', type: 'date' })}
					selectable
					selected={$nftListStore.sort.type === 'date' && $nftListStore.sort.order === 'desc'}
				>
					{$i18n.nfts.text.oldest_first}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => setSorting({ order: 'asc', type: 'collection-name' })}
					selectable
					selected={$nftListStore.sort.type === 'collection-name' &&
						$nftListStore.sort.order === 'asc'}
				>
					{$i18n.nfts.text.collection_atoz}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => setSorting({ order: 'desc', type: 'collection-name' })}
					selectable
					selected={$nftListStore.sort.type === 'collection-name' &&
						$nftListStore.sort.order === 'desc'}
				>
					{$i18n.nfts.text.collection_ztoa}
				</ListItemButton>
			</ListItem>
		</List>
	{/snippet}
</ResponsivePopover>
