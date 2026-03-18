<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import { tokenCategoryFilter } from '$lib/derived/settings.derived';
	import { TokenCategoryTagValue } from '$lib/enums/token-tag';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenCategoryFilterStore } from '$lib/stores/settings.store';

	let dropdown = $state<Dropdown>();

	const categories = Object.values(TokenCategoryTagValue);

	const getCategoryLabel = (value: TokenCategoryTagValue): string =>
		$i18n.token_tag.category[value] ?? value;

	const currentLabel: string = $derived(
		isNullish($tokenCategoryFilter)
			? $i18n.tokens.text.asset_type_all
			: getCategoryLabel($tokenCategoryFilter)
	);

	const select = (value: TokenCategoryTagValue | undefined) => {
		tokenCategoryFilterStore.set({ key: 'token-category-filter', value: { value } });
		dropdown?.close();
	};
</script>

<Dropdown bind:this={dropdown} ariaLabel={$i18n.tokens.text.asset_type_all} buttonBorder>
	<span class="font-medium">{currentLabel}</span>

	{#snippet items()}
		<List condensed noPadding>
			<ListItem>
				<Button
					alignLeft
					colorStyle="tertiary-alt"
					fullWidth
					onclick={() => select(undefined)}
					paddingSmall
					styleClass="py-1 rounded-md font-normal text-primary underline-none pl-0.5 min-w-28"
					transparent
				>
					<span class="w-[20px] pt-0.75 text-brand-primary">
						{#if isNullish($tokenCategoryFilter)}
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
						onclick={() => select(category)}
						paddingSmall
						styleClass="py-1 rounded-md font-normal text-primary underline-none pl-0.5 min-w-28"
						transparent
					>
						<span class="w-[20px] pt-0.75 text-brand-primary">
							{#if $tokenCategoryFilter === category}
								<IconCheck size="20" />
							{/if}
						</span>
						{getCategoryLabel(category)}
					</Button>
				</ListItem>
			{/each}
		</List>
	{/snippet}
</Dropdown>
