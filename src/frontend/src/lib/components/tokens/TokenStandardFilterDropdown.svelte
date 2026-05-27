<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ModalFilterButton from '$lib/components/ui/ModalFilterButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenStandardCode } from '$lib/types/token';

	interface Props {
		availableStandards: TokenStandardCode[];
		selectedStandard?: TokenStandardCode;
		onSelect: (value?: TokenStandardCode) => void;
	}

	let { availableStandards, selectedStandard, onSelect }: Props = $props();

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

	const getStandardLabel = (value: TokenStandardCode): string => value.toUpperCase();

	const currentLabel: string = $derived(
		isNullish(selectedStandard)
			? $i18n.tokens.text.standard_all
			: getStandardLabel(selectedStandard)
	);

	const select = (value: TokenStandardCode | undefined) => {
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

		{#each availableStandards as standard (standard)}
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
						{#if selectedStandard === standard}
							<IconCheck size="20" />
						{/if}
					</span>
					{getStandardLabel(standard)}
				</Button>
			</ListItem>
		{/each}
	</List>
</Popover>
