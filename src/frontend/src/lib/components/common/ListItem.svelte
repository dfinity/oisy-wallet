<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'default' | 'styled';
		children?: Snippet;
	}

	const { variant = 'default', children }: Props = $props();

	const classes = {
		default: 'flex flex-row',
		styled:
			'border-b-1 last-of-type:border-b-0 flex flex-row justify-between border-brand-subtle-10 py-1.5'
	};
</script>

{#if nonNullish(children)}
	<li class={classes[variant]}>
		{@render children?.()}
	</li>
{/if}
