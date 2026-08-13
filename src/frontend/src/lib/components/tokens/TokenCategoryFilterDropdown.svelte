<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
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

<ModalFilterButton ariaLabel={currentLabel} onclick={() => (visible = !visible)} bind:button>
	{currentLabel}
</ModalFilterButton>

<Popover anchor={button} direction="rtl" invisibleBackdrop bind:visible>
	<List condensed noPadding>
		<ListItem>
			<Button
				alignLeft
				colorStyle="tertiary-alt"
				fullWidth
				innerStyleClass="font-normal text-primary"
				onclick={() => select(undefined)}
				paddingSmall
				styleClass="py-1 rounded-md pl-0.5 min-w-28"
				transparent
			>
				<span class="w-[20px] pt-0.75 text-brand-primary">
					{#if isNullish(activeCategory)}
						<IconCheck size="20" />
					{/if}
				</span>
				{$i18n.tokens.text.asset_type_all}
			</Button>
		</ListItem>

		{#each categories as category (category)}
			<ListItem>
				<Button
					alignLeft
					colorStyle="tertiary-alt"
					fullWidth
					innerStyleClass="font-normal text-primary"
					onclick={() => select(category)}
					paddingSmall
					styleClass="py-1 rounded-md pl-0.5 min-w-28"
					transparent
				>
					<span class="w-[20px] pt-0.75 text-brand-primary">
						{#if activeCategory === category}
							<IconCheck size="20" />
						{/if}
					</span>
					{getCategoryLabel(category)}
				</Button>
			</ListItem>
		{/each}
	</List>
</Popover>
