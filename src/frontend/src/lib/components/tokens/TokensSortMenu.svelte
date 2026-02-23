<script lang="ts">
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ListItemButton from '$lib/components/common/ListItemButton.svelte';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import { tokensSortType } from '$lib/derived/settings.derived';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokensSortStore } from '$lib/stores/settings.store';
	import type { TokensSortingType } from '$lib/types/tokens-sort';

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

	const setSorting = (sort: TokensSortingType) => {
		tokensSortStore.set({ key: 'tokens-sort', value: sort });
	};

	const trackSortingEvent = ({ type }: { type: string }) => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.SORT,
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
						trackSortingEvent({ type: 'value' });
						setSorting({ type: 'value' });
					}}
					selectable
					selected={$tokensSortType === 'value'}
				>
					{$i18n.tokens.text.sort_by_value}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => {
						trackSortingEvent({ type: 'performance' });
						setSorting({ type: 'performance' });
					}}
					selectable
					selected={$tokensSortType === 'performance'}
				>
					{$i18n.tokens.text.sort_by_performance}
				</ListItemButton>
			</ListItem>
			<ListItem>
				<ListItemButton
					onclick={() => {
						trackSortingEvent({ type: 'symbol' });
						setSorting({ type: 'symbol' });
					}}
					selectable
					selected={$tokensSortType === 'symbol'}
				>
					{$i18n.tokens.text.sort_by_symbol}
				</ListItemButton>
			</ListItem>
		</List>
	{/snippet}
</ResponsivePopover>
