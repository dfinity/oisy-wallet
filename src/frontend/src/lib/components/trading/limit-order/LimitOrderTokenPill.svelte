<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconChevronRight from '$lib/components/icons/lucide/IconChevronRight.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		symbol?: string;
		disabled?: boolean;
		onclick: () => void;
	}

	let { symbol, disabled = false, onclick }: Props = $props();
</script>

<button
	class="flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2 py-1"
	class:border-dashed={!nonNullish(symbol)}
	class:border-secondary={nonNullish(symbol)}
	class:opacity-40={disabled}
	class:text-brand-primary={!nonNullish(symbol) && !disabled}
	{disabled}
	{onclick}
	type="button"
>
	<span class="text-sm font-medium" class:text-primary={nonNullish(symbol)}>
		{symbol ?? $i18n.core.text.select}
	</span>
	<span class="rotate-90 text-tertiary" aria-hidden="true"><IconChevronRight size="14" /></span>
</button>
