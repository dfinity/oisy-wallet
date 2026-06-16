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
	<label class={`text-tertiary mr-1 text-sm sm:mr-2 ${labelStyleClass}`} for={ref}>
		{@render label?.()}
	</label>

	<div
		class="text-tertiary flex flex-col items-end gap-1 text-sm sm:flex-row sm:items-center sm:gap-2"
	>
		<span class="text-primary font-bold">{@render mainValue?.()}</span>

		{@render secondaryValue?.()}
	</div>
</div>
