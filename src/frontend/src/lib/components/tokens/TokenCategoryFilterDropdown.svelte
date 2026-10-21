<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ListItemButton from '$lib/components/common/ListItemButton.svelte';
	import ModalFilterButton from '$lib/components/ui/ModalFilterButton.svelte';
	import Popover from '$lib/components/ui/Popover.svelte';
	import { tokenCategoryFilter } from '$lib/derived/settings.derived';
	import { TokenCategoryTagValue } from '$lib/enums/token-tag';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenCategoryFilterStore } from '$lib/stores/settings.store';

	interface Props {
		selectedCategory?: TokenCategoryTagValue;
		onSelect?: (value?: TokenCategoryTagValue) => void;
	}

	let { selectedCategory, onSelect }: Props = $props();

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

	const categories = Object.values(TokenCategoryTagValue);

	const getCategoryLabel = (value: TokenCategoryTagValue): string =>
		$i18n.token_tag.category[value] ?? value;

	let activeCategory = $derived(onSelect ? selectedCategory : $tokenCategoryFilter);

	const currentLabel: string = $derived(
		isNullish(activeCategory) ? $i18n.tokens.text.asset_type_all : getCategoryLabel(activeCategory)
	);

	const select = (value: TokenCategoryTagValue | undefined) => {
		if (onSelect) {
			onSelect(value);
		} else {
			tokenCategoryFilterStore.set({ key: 'token-category-filter', value: { value } });
		}
		visible = false;
	};
</script>

<ModalFilterButton
	ariaLabel={currentLabel}
	onclick={() => (visible = !visible)}
	opened={visible}
	bind:button
>
	{currentLabel}
</ModalFilterButton>

<Popover anchor={button} direction="rtl" invisibleBackdrop bind:visible>
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

			{#each categories as category (category)}
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
