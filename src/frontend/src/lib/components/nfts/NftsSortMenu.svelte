<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { type NftListSortingType, nftListStore } from '$lib/stores/nft-list.store';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';

	let visible = $state(false);
	let button = $state<HTMLButtonElement | undefined>();

	const setSorting = (sort: NftListSortingType) => {
		nftListStore.update((p) => ({ ...p, sort }));
	};
</script>

{#snippet content()}
	<span class="mb-2 flex text-sm font-bold">Grouping</span>

	<List noPadding>
		<ListItem>
			<Button
				disabled
				onclick={() => setSorting({ order: 'asc', type: 'date' })}
				fullWidth
				alignLeft
				styleClass="py-3 rounded-md text-primary underline-none pl-0.5 min-w-28"
				colorStyle="tertiary-alt"
				transparent
			>
				<span class="pt-0.75 w-[20px] text-brand-primary">
					{#if $nftListStore.sort.type === 'date' && $nftListStore.sort.order === 'asc'}
						<IconCheck size="20" />
					{/if}
				</span>
				<span class="font-normal">Recents first</span>
			</Button>
		</ListItem>
		<ListItem>
			<Button
				disabled
				onclick={() => setSorting({ order: 'desc', type: 'date' })}
				fullWidth
				alignLeft
				styleClass="py-3 rounded-md text-primary underline-none pl-0.5 min-w-28"
				colorStyle="tertiary-alt"
				transparent
			>
				<span class="pt-0.75 w-[20px] text-brand-primary">
					{#if $nftListStore.sort.type === 'date' && $nftListStore.sort.order === 'desc'}
						<IconCheck size="20" />
					{/if}
				</span>
				<span class="font-normal">Oldest first</span>
			</Button>
		</ListItem>
		<ListItem>
			<Button
				onclick={() => setSorting({ order: 'asc', type: 'collection-name' })}
				fullWidth
				alignLeft
				styleClass="py-3 rounded-md text-primary underline-none pl-0.5 min-w-28"
				colorStyle="tertiary-alt"
				transparent
			>
				<span class="pt-0.75 w-[20px] text-brand-primary">
					{#if $nftListStore.sort.type === 'collection-name' && $nftListStore.sort.order === 'asc'}
						<IconCheck size="20" />
					{/if}
				</span>
				<span class="font-normal">Collection name A-Z</span>
			</Button>
		</ListItem>
		<ListItem>
			<Button
				onclick={() => setSorting({ order: 'desc', type: 'collection-name' })}
				fullWidth
				alignLeft
				styleClass="py-3 rounded-md text-primary underline-none pl-0.5 min-w-28"
				colorStyle="tertiary-alt"
				transparent
			>
				<span class="pt-0.75 w-[20px] text-brand-primary">
					{#if $nftListStore.sort.type === 'collection-name' && $nftListStore.sort.order === 'desc'}
						<IconCheck size="20" />
					{/if}
				</span>
				<span class="font-normal">Collection name Z-A</span>
			</Button>
		</ListItem>
	</List>
{/snippet}

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

<Responsive up="sm">
	<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
		{@render content()}
	</Popover>
</Responsive>
<Responsive down="sm">
	<BottomSheet {content} bind:visible>
		{#snippet footer()}
			<ButtonDone variant="secondary-light" onclick={() => (visible = false)} />
		{/snippet}
	</BottomSheet>
</Responsive>
