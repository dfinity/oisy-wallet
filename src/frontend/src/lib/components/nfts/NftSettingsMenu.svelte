<script lang="ts">
	import { preventDefault } from '@dfinity/gix-components';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ListItemButton from '$lib/components/common/ListItemButton.svelte';
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import NftsShowHiddenToggle from '$lib/components/nfts/NftsShowHiddenToggle.svelte';
	import NftsShowSpamToggle from '$lib/components/nfts/NftsShowSpamToggle.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import { nftGroupByCollection, showHidden, showSpam } from '$lib/derived/settings.derived';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		nftGroupByCollectionStore,
		showHiddenStore,
		showSpamStore
	} from '$lib/stores/settings.store';
	import {modalStore} from "$lib/stores/modal.store";

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

	const setGrouping = (grouping: boolean) => {
		trackNftSettingsEvent({
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.GROUP,
			event_value: grouping ? 'collection' : 'plain_list'
		});
		nftGroupByCollectionStore.set({ key: 'nft-group-by-collection', value: grouping });
	};

	const toggleShowHidden = () => {
		trackNftSettingsEvent({
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.VISIBILITY,
			event_subcontext: 'hidden',
			event_value: !$showHidden ? 'show' : 'hide'
		});
		showHiddenStore.set({ key: 'show-hidden', value: { enabled: !$showHidden } });
	};

	const toggleShowSpam = () => {
		trackNftSettingsEvent({
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.VISIBILITY,
			event_subcontext: 'spam',
			event_value: !$showSpam ? 'show' : 'hide'
		});
		showSpamStore.set({ key: 'show-spam', value: { enabled: !$showSpam } });
	};

	// Added a separate method to extend metadata for different settings in the future
	const trackNftSettingsEvent = (metadata: Record<string, string>) => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				...metadata
			}
		});
	};

	const manageTokensId = Symbol();

	const openManageTokens = () => {
		modalStore.openManageTokens({ id: manageTokensId });
		visible = false;
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
		<IconManage />
	{/snippet}
</ButtonIcon>

<ResponsivePopover {button} bind:visible>
	{#snippet content()}
		<span class="mb-2 flex text-sm font-bold">{$i18n.nfts.text.grouping}</span>

		<List noPadding>
			<ListItem>
				<ListItemButton
					onclick={() => {
						setGrouping(false);
					}}
					selectable
					selected={!$nftGroupByCollection}
				>
					{$i18n.nfts.text.as_plain_list}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => {
						setGrouping(true);
					}}
					selectable
					selected={$nftGroupByCollection}
				>
					{$i18n.nfts.text.by_collection}
				</ListItemButton>
			</ListItem>
		</List>

		<span class="mt-3 mb-2 flex text-sm font-bold">{$i18n.tokens.manage.text.list_settings}</span>

		<List condensed noPadding>
			<ListItem>
				<LogoButton fullWidth onClick={preventDefault(toggleShowHidden)}>
					{#snippet logo()}
						<IconEyeOff />
					{/snippet}
					{#snippet title()}
						<span class="text-sm font-normal">{$i18n.nfts.text.show_hidden}</span>
					{/snippet}
					{#snippet action()}
						<NftsShowHiddenToggle />
					{/snippet}
				</LogoButton>
			</ListItem>
			<ListItem>
				<LogoButton fullWidth onClick={preventDefault(toggleShowSpam)}>
					{#snippet logo()}
						<IconWarning />
					{/snippet}
					{#snippet title()}
						<span class="text-sm font-normal">{$i18n.nfts.text.show_spam}</span>
					{/snippet}
					{#snippet action()}
						<NftsShowSpamToggle />
					{/snippet}
				</LogoButton>
			</ListItem>
			<ListItem>
				<LogoButton fullWidth onClick={openManageTokens}>
					{#snippet logo()}
						<IconManage />
					{/snippet}
					{#snippet title()}
						<span class="text-sm font-normal">{$i18n.tokens.manage.text.title_nft}</span>
					{/snippet}
				</LogoButton>
			</ListItem>
		</List>
	{/snippet}
</ResponsivePopover>
