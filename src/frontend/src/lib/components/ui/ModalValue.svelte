<script lang="ts">
	import { fade } from 'svelte/transition';

	export let ref: undefined | string = undefined;
	export let labelStyleClass: string | undefined = undefined;
</script>

<div in:fade class="mb-2 flex w-full justify-between last:mb-0 md:items-center">
	<label for={ref} class={`mr-1 text-sm text-tertiary sm:mr-2 ${labelStyleClass}`}
		><slot name="label" /></label
	>

	<div
		class="flex flex-col items-end gap-1 text-sm text-tertiary sm:flex-row sm:items-center sm:gap-2"
	>
		<span class="font-bold text-primary"><slot name="main-value" /></span>

		<slot name="secondary-value" />
	</div>
</div>
