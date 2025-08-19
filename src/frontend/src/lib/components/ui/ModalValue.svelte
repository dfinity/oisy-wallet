<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		ref?: string;
		labelStyleClass?: string;
		label?: Snippet;
		mainValue?: Snippet;
		secondaryValue?: Snippet;
	}

	let { ref, labelStyleClass, label, mainValue, secondaryValue }: Props = $props();
</script>

<div class="mb-2 flex w-full justify-between last:mb-0 md:items-center" in:fade>
	<label class={`mr-1 text-sm text-tertiary sm:mr-2 ${labelStyleClass}`} for={ref}>
		{@render label?.()}
	</label>

	<div
		class="flex flex-col items-end gap-1 text-sm text-tertiary sm:flex-row sm:items-center sm:gap-2"
	>
		<span class="font-bold text-primary">{@render mainValue?.()}</span>

		{@render secondaryValue?.()}
	</div>
</div>
