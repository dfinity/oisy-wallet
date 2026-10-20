<script lang="ts">
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { showHidden, showSpam } from '$lib/derived/settings.derived';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { showHiddenStore, showSpamStore } from '$lib/stores/settings.store';

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

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
	ariaLabel={$i18n.tokens.manage.text.list_settings}
	colorStyle="muted"
	expanded={visible}
	link={false}
	onclick={() => (visible = true)}
	styleClass="relative hit-area hit-area-touch"
	bind:button
>
	{#snippet icon()}
		<IconManage />
	{/snippet}
</ButtonIcon>

<ResponsivePopover
	ariaLabel={$i18n.tokens.manage.text.list_settings}
	{button}
	dropdown
	bind:visible
>
	{#snippet content()}
		<div class="menu-surface min-w-56">
			<span class="menu-heading">{$i18n.tokens.manage.text.list_settings}</span>

			<List condensed noPadding>
				<ListItem>
					<Toggle
						ariaLabel={$i18n.nfts.text.show_hidden}
						checked={$showHidden}
						onToggle={toggleShowHidden}
						showLabel
					/>
				</ListItem>
				<ListItem>
					<Toggle
						ariaLabel={$i18n.nfts.text.show_spam}
						checked={$showSpam}
						onToggle={toggleShowSpam}
						showLabel
					/>
				</ListItem>
				<ListItem>
					<LogoButton fullWidth onClick={openManageTokens}>
						{#snippet logo()}
							<IconManage size="20px" />
						{/snippet}
						{#snippet title()}
							<span class="menu-row-label">{$i18n.tokens.manage.text.title_nft}</span>
						{/snippet}
					</LogoButton>
				</ListItem>
			</List>
		</div>
	{/snippet}
</ResponsivePopover>
