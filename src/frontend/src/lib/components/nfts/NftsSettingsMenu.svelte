<script lang="ts">
	import { Popover, Toggle } from '@dfinity/gix-components';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { nftListStore } from '$lib/stores/nft-list.store';

	let visible = $state(false);
	let button = $state<HTMLButtonElement | undefined>();

	const setGrouping = (grouping: boolean) => {
		nftListStore.update((p) => ({ ...p, groupByCollection: grouping }));
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
		<IconManage />
	{/snippet}
</ButtonIcon>

{#snippet content()}
	<span class="mb-2 flex text-sm font-bold">Grouping</span>

	<List noPadding>
		<ListItem>
			<Button
				onclick={() => setGrouping(false)}
				fullWidth
				alignLeft
				styleClass="py-3 rounded-md text-primary underline-none pl-0.5 min-w-28"
				colorStyle="tertiary-alt"
				transparent
			>
				<span class="pt-0.75 w-[20px] text-brand-primary">
					{#if !$nftListStore.groupByCollection}
						<IconCheck size="20" />
					{/if}
				</span>
				<span class="font-normal">Show as plain list</span>
			</Button>
		</ListItem>
		<ListItem>
			<Button
				onclick={() => setGrouping(true)}
				fullWidth
				alignLeft
				styleClass="py-3 rounded-md text-primary underline-none pl-0.5 min-w-28"
				colorStyle="tertiary-alt"
				transparent
			>
				<span class="pt-0.75 w-[20px] text-brand-primary">
					{#if $nftListStore.groupByCollection}
						<IconCheck size="20" />
					{/if}
				</span>
				<span class="font-normal">Group by collection</span>
			</Button>
		</ListItem>
	</List>

	<span class="mb-2 mt-3 flex text-sm font-bold">{$i18n.tokens.manage.text.list_settings}</span>

	<List noPadding condensed>
		<ListItem>
			<LogoButton fullWidth>
				{#snippet logo()}
					<IconWarning />
				{/snippet}
				{#snippet title()}
					<span class="text-sm font-normal">Show spam</span>
				{/snippet}
				{#snippet action()}
					<Toggle disabled checked={false} ariaLabel="" />
				{/snippet}
			</LogoButton>
		</ListItem>
		<ListItem>
			<LogoButton fullWidth>
				{#snippet logo()}
					<IconEyeOff />
				{/snippet}
				{#snippet title()}
					<span class="text-sm font-normal">Show hidden</span>
				{/snippet}
				{#snippet action()}
					<Toggle disabled checked={false} ariaLabel="" />
				{/snippet}
			</LogoButton>
		</ListItem>
	</List>
{/snippet}

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
