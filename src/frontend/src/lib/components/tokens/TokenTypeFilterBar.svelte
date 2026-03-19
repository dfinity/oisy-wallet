<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import PillButton from '$lib/components/ui/PillButton.svelte';
	import ScrollableBar from '$lib/components/ui/ScrollableBar.svelte';
	import { tokenCategoryFilter } from '$lib/derived/settings.derived';
	import { TokenCategoryTagValue } from '$lib/enums/token-tag';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenCategoryFilterStore } from '$lib/stores/settings.store';

	const categories = Object.values(TokenCategoryTagValue);

	const getCategoryLabel = (value: TokenCategoryTagValue): string =>
		$i18n.token_tag.category[value] ?? value;

	const select = (value: TokenCategoryTagValue | undefined) =>
		tokenCategoryFilterStore.set({ key: 'token-category-filter', value: { value } });
</script>

<ScrollableBar>
	<PillButton onClick={() => select(undefined)} selected={isNullish($tokenCategoryFilter)}>
		{$i18n.tokens.text.asset_type_all}
	</PillButton>

	{#each categories as category (category)}
		<PillButton onClick={() => select(category)} selected={$tokenCategoryFilter === category}>
			{getCategoryLabel(category)}
		</PillButton>
	{/each}
</ScrollableBar>
