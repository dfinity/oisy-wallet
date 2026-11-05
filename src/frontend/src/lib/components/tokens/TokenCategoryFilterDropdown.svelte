<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ListItemButton from '$lib/components/common/ListItemButton.svelte';
	import FilterChip from '$lib/components/ui/FilterChip.svelte';
	import Popover from '$lib/components/ui/Popover.svelte';
	import { TOKEN_CATEGORY_FILTER } from '$lib/constants/test-ids.constants';
	import { tokenCategoryFilter } from '$lib/derived/settings.derived';
	import { TokenCategoryTagValue } from '$lib/enums/token-tag';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenCategoryFilterStore } from '$lib/stores/settings.store';

	interface Props {
		selectedCategory?: TokenCategoryTagValue;
		// The asset types to offer; every one when absent.
		categories?: TokenCategoryTagValue[];
		onSelect?: (value?: TokenCategoryTagValue) => void;
	}

	let { selectedCategory, categories, onSelect }: Props = $props();

	let visible = $state(false);

	let anchor = $state<HTMLElement | undefined>();

	let trigger = $state<HTMLButtonElement | undefined>();

	const allCategories = Object.values(TokenCategoryTagValue);

	let offeredCategories = $derived(
		nonNullish(categories)
			? allCategories.filter((category) => categories.includes(category))
			: allCategories
	);

	const getCategoryLabel = (value: TokenCategoryTagValue): string =>
		$i18n.token_tag.category[value] ?? value;

	let activeCategory = $derived(onSelect ? selectedCategory : $tokenCategoryFilter);

	const select = (value: TokenCategoryTagValue | undefined) => {
		if (onSelect) {
			onSelect(value);
		} else {
			tokenCategoryFilterStore.set({ key: 'token-category-filter', value: { value } });
		}
		visible = false;
	};
</script>

<FilterChip
	clearAriaLabel={$i18n.tokens.text.clear_asset_type_filter}
	hasValue={nonNullish(activeCategory)}
	label={isNullish(activeCategory)
		? $i18n.tokens.text.asset_type_all_short
		: getCategoryLabel(activeCategory)}
	onClear={() => select(undefined)}
	onClick={() => (visible = !visible)}
	opened={visible}
	testId={TOKEN_CATEGORY_FILTER}
	bind:anchor
	bind:trigger
/>

<Popover
	{anchor}
	ariaLabel={$i18n.tokens.text.filter_asset_types}
	direction="rtl"
	dropdown
	invisibleBackdrop
	returnFocus={trigger}
	bind:visible
>
	<div class="menu-surface">
		<List condensed noPadding>
			<ListItem>
				<ListItemButton
					onclick={() => select(undefined)}
					selectable
					selected={isNullish(activeCategory)}
				>
					{$i18n.tokens.text.asset_type_all}
				</ListItemButton>
			</ListItem>

			{#each offeredCategories as category (category)}
				<ListItem>
					<ListItemButton
						onclick={() => select(category)}
						selectable
						selected={activeCategory === category}
					>
						{getCategoryLabel(category)}
					</ListItemButton>
				</ListItem>
			{/each}
		</List>
	</div>
</Popover>
