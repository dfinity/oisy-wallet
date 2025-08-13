<script lang="ts">
	import { Backdrop, Popover, Toggle } from '@dfinity/gix-components';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconHide from '$lib/components/icons/IconHide.svelte';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import TokensZeroBalanceToggle from '$lib/components/tokens/TokensZeroBalanceToggle.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import NotificationBlob from '$lib/components/ui/NotificationBlob.svelte';
	import { hideZeroBalances } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { emit } from '$lib/utils/events.utils';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import { LANGUAGE_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { LANGUAGES, SUPPORTED_LANGUAGES } from '$env/i18n';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import List from '$lib/components/common/List.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { nftListStore } from '$lib/stores/nft-list.store';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';

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
				paddingSmall
				styleClass="py-1 rounded-md text-primary underline-none pl-0.5 min-w-28"
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
				paddingSmall
				styleClass="py-1 rounded-md text-primary underline-none pl-0.5 min-w-28"
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

	<List>
		<ListItem>
			<span class="flex gap-2">
				<span class="flex">
					<IconWarning />
				</span>
				<span class="font-normal">Show spam</span>
			</span>
			<span>
				<Toggle disabled checked={false} ariaLabel="" />
			</span>
		</ListItem>
		<ListItem>
			<span class="flex gap-2">
				<span class="flex">
					<IconEyeOff />
				</span>
				<span class="font-normal">Show hidden</span>
			</span>
			<span>
				<Toggle disabled checked={false} ariaLabel="" />
			</span>
		</ListItem>
	</List>
{/snippet}

<Responsive up="sm">
	<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
		{@render content()}
	</Popover>
</Responsive>
<Responsive down="sm">
	<BottomSheet {content} bind:visible />
</Responsive>
