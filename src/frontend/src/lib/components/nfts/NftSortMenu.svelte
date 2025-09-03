<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ListItemButton from '$lib/components/common/ListItemButton.svelte';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { type NftSortingType, nftSortStore } from '$lib/stores/settings.store';
	import { nftSortType, nftSortOrder } from '$lib/derived/settings.derived';

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

	const setSorting = (sort: NftSortingType) => {
		nftSortStore.set({ key: 'nft-sort', value: sort });
	};
</script>

<ButtonIcon
	ariaLabel={$i18n.navigation.alt.menu}
	colorStyle="muted"
	disabled={$erc20UserTokensNotInitialized}
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
					onclick={() => setSorting({ order: 'asc', type: 'date' })}
					selectable
					selected={$nftSortType === 'date' && $nftSortOrder === 'asc'}
				>
					{$i18n.nfts.text.recents_first}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => setSorting({ order: 'desc', type: 'date' })}
					selectable
					selected={$nftSortType === 'date' && $nftSortOrder === 'desc'}
				>
					{$i18n.nfts.text.oldest_first}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => setSorting({ order: 'asc', type: 'collection-name' })}
					selectable
					selected={$nftSortType === 'collection-name' && $nftSortOrder === 'asc'}
				>
					{$i18n.nfts.text.collection_atoz}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => setSorting({ order: 'desc', type: 'collection-name' })}
					selectable
					selected={$nftSortType === 'collection-name' && $nftSortOrder === 'desc'}
				>
					{$i18n.nfts.text.collection_ztoa}
				</ListItemButton>
			</ListItem>
		</List>
	{/snippet}
</ResponsivePopover>
