<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import PillButton from '$lib/components/ui/PillButton.svelte';
	import ScrollableBar from '$lib/components/ui/ScrollableBar.svelte';
	import { tokenCategoryFilter } from '$lib/derived/settings.derived';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { TokenCategoryTagValue } from '$lib/enums/token-tag';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenCategoryFilterStore } from '$lib/stores/settings.store';

	const categories = Object.values(TokenCategoryTagValue);

	const getCategoryLabel = (value: TokenCategoryTagValue): string =>
		$i18n.token_tag.category[value] ?? value;

	const select = (value: TokenCategoryTagValue | undefined) => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.TYPE,
				event_value: value ?? 'all'
			}
		});

		tokenCategoryFilterStore.set({ key: 'token-category-filter', value: { value } });
	};
</script>

<ScrollableBar>
	<PillButton onClick={() => select(undefined)} selected={isNullish($tokenCategoryFilter)}>
		{$i18n.tokens.text.asset_type_all}
	</PillButton>

	{#each categories as category (category)}
		<PillButton
			accent={category === TokenCategoryTagValue.COMPUTE}
			onClick={() => select(category)}
			selected={$tokenCategoryFilter === category}
		>
			{getCategoryLabel(category)}
		</PillButton>
	{/each}
</ScrollableBar>
