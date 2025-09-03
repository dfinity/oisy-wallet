<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ListItemButton from '$lib/components/common/ListItemButton.svelte';
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import { nftListGroupByCollection } from '$lib/derived/nfts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { nftListStore } from '$lib/stores/nft-list.store';
	import NftCollectionShowSpamToggle from '$lib/components/nfts/NftCollectionShowSpamToggle.svelte';
	import { emit } from '$lib/utils/events.utils';

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

	const setGrouping = (grouping: boolean) => {
		nftListStore.setGroupByCollection(grouping);
	};

	const toggleShowSpam = () => {
		document.dispatchEvent(new CustomEvent('show-spam'));
		emit({ message: 'oisyToggleShowSpam' });
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
		<IconManage />
	{/snippet}
</ButtonIcon>

<ResponsivePopover {button} bind:visible>
	{#snippet content()}
		<span class="mb-2 flex text-sm font-bold">{$i18n.nfts.text.grouping}</span>

		<List noPadding>
			<ListItem>
				<ListItemButton
					onclick={() => setGrouping(false)}
					selectable
					selected={!$nftListGroupByCollection}
				>
					{$i18n.nfts.text.as_plain_list}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => setGrouping(true)}
					selectable
					selected={$nftListGroupByCollection}
				>
					{$i18n.nfts.text.by_collection}
				</ListItemButton>
			</ListItem>
		</List>

		<span class="mb-2 mt-3 flex text-sm font-bold">{$i18n.tokens.manage.text.list_settings}</span>

		<List condensed noPadding>
			<ListItem>
				<LogoButton fullWidth>
					{#snippet logo()}
						<IconEyeOff />
					{/snippet}
					{#snippet title()}
						<span class="text-sm font-normal">{$i18n.nfts.text.show_hidden}</span>
					{/snippet}
					{#snippet action()}
						<Toggle ariaLabel={$i18n.nfts.text.show_hidden} checked={false} disabled />
					{/snippet}
				</LogoButton>
			</ListItem>
			<ListItem>
				<LogoButton fullWidth onClick={toggleShowSpam}>
					{#snippet logo()}
						<IconWarning />
					{/snippet}
					{#snippet title()}
						<span class="text-sm font-normal">{$i18n.nfts.text.show_spam}</span>
					{/snippet}
					{#snippet action()}
						<NftCollectionShowSpamToggle />
					{/snippet}
				</LogoButton>
			</ListItem>
		</List>
	{/snippet}
</ResponsivePopover>
