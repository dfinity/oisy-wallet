<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ModalFilterButton from '$lib/components/ui/ModalFilterButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenStandard } from '$lib/types/token';
	import {
		tokenStandardKey,
		tokenStandardLabel,
		tokenStandardsEqual
	} from '$lib/utils/token.utils';

	interface Props {
		availableStandards: TokenStandard[];
		selectedStandard?: TokenStandard;
		onSelect: (value?: TokenStandard) => void;
	}

	let { availableStandards, selectedStandard, onSelect }: Props = $props();

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

	const isSelected = (standard: TokenStandard): boolean =>
		nonNullish(selectedStandard) && tokenStandardsEqual({ a: selectedStandard, b: standard });

	const currentLabel: string = $derived(
		isNullish(selectedStandard)
			? $i18n.tokens.text.standard_all
			: tokenStandardLabel(selectedStandard)
	);

	const select = (value: TokenStandard | undefined) => {
		onSelect(value);
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
					{#if isNullish(selectedStandard)}
						<IconCheck size="20" />
					{/if}
				</span>
				{$i18n.tokens.text.standard_all}
			</Button>
		</ListItem>

		{#each availableStandards as standard (tokenStandardKey(standard))}
			<ListItem>
				<Button
					alignLeft
					colorStyle="tertiary-alt"
					fullWidth
					innerStyleClass="font-normal text-primary"
					onclick={() => select(standard)}
					paddingSmall
					styleClass="py-1 rounded-md pl-0.5 min-w-28"
					transparent
				>
					<span class="w-[20px] pt-0.75 text-brand-primary">
						{#if isSelected(standard)}
							<IconCheck size="20" />
						{/if}
					</span>
					{tokenStandardLabel(standard)}
				</Button>
			</ListItem>
		{/each}
	</List>
</Popover>
