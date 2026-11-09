<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ListItemButton from '$lib/components/common/ListItemButton.svelte';
	import FilterChip from '$lib/components/ui/FilterChip.svelte';
	import { TOKEN_CATEGORY_FILTER } from '$lib/constants/test-ids.constants';
	import { TokenCategoryTagValue } from '$lib/enums/token-tag';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		selectedCategory?: TokenCategoryTagValue;
		// The asset types to offer; every one when absent.
		categories?: TokenCategoryTagValue[];
		onSelect: (value?: TokenCategoryTagValue) => void;
	}

	let { selectedCategory, categories, onSelect }: Props = $props();

	let visible = $state(false);

	const allCategories = Object.values(TokenCategoryTagValue);

	let offeredCategories = $derived(
		nonNullish(categories)
			? allCategories.filter((category) => categories.includes(category))
			: allCategories
	);

	const getCategoryLabel = (value: TokenCategoryTagValue): string =>
		$i18n.token_tag.category[value] ?? value;

	const select = (value: TokenCategoryTagValue | undefined) => {
		onSelect(value);

		visible = false;
	};
</script>

<FilterChip
	clearAriaLabel={$i18n.tokens.text.clear_asset_type_filter}
	direction="rtl"
	hasValue={nonNullish(selectedCategory)}
	label={isNullish(selectedCategory)
		? $i18n.tokens.text.asset_type_all_short
		: getCategoryLabel(selectedCategory)}
	onClear={() => onSelect(undefined)}
	panelLabel={$i18n.tokens.text.filter_asset_types}
	testId={TOKEN_CATEGORY_FILTER}
	bind:visible
>
	<List condensed noPadding>
		<ListItem>
			<ListItemButton
				onclick={() => select(undefined)}
				selectable
				selected={isNullish(selectedCategory)}
			>
				{$i18n.tokens.text.asset_type_all}
			</ListItemButton>
		</ListItem>

		{#each offeredCategories as category (category)}
			<ListItem>
				<ListItemButton
					onclick={() => select(category)}
					selectable
					selected={selectedCategory === category}
				>
					{getCategoryLabel(category)}
				</ListItemButton>
			</ListItem>
		{/each}
	</List>
</FilterChip>
