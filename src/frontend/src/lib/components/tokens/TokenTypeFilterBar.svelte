<script lang="ts">
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

<div class="flex gap-2 overflow-x-auto pb-1">
	<button
		class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
		class:bg-brand-primary={$tokenCategoryFilter === undefined}
		class:border-brand-primary={$tokenCategoryFilter === undefined}
		class:border-secondary={$tokenCategoryFilter !== undefined}
		class:text-primary-inverted={$tokenCategoryFilter === undefined}
		class:text-secondary={$tokenCategoryFilter !== undefined}
		onclick={() => select(undefined)}
	>
		{$i18n.tokens.text.asset_type_all}
	</button>
	{#each categories as category (category)}
		<button
			class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
			class:bg-brand-primary={$tokenCategoryFilter === category}
			class:border-brand-primary={$tokenCategoryFilter === category}
			class:border-secondary={$tokenCategoryFilter !== category}
			class:text-primary-inverted={$tokenCategoryFilter === category}
			class:text-secondary={$tokenCategoryFilter !== category}
			onclick={() => select(category)}
		>
			{getCategoryLabel(category)}
		</button>
	{/each}
</div>
