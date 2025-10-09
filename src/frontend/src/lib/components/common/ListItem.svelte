<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import type { ListContext } from '$lib/components/common/List.svelte';
	import type { ListVariant } from '$lib/types/style';

	interface Props {
		children?: Snippet;
		styleClass?: string;
	}

	const { children, styleClass }: Props = $props();

	const { variant, condensed, noPadding, noBorder, itemStyleClass } =
		getContext<ListContext>('list-context');

	const classes: { [key in ListVariant]: string } = {
		none: `ml-3 ${condensed || noPadding ? 'py-0' : 'py-1'} ${styleClass ?? ''}`,
		styled: `flex justify-between ${!noPadding ? (condensed ? 'py-1.5 px-1' : 'py-2.5 px-1') : ''} ${!noBorder ? 'border-b-1 last-of-type:border-b-0 border-brand-subtle-10' : ''} ${styleClass ?? ''} ${itemStyleClass}`
	};
</script>

{#if nonNullish(children)}
	<li class={classes[variant]}>
		{@render children?.()}
	</li>
{/if}
