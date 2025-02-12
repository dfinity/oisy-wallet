<script lang="ts">
	import { nonNullish } from '@dfinity/utils';

	export let ref: undefined | string = undefined;

	let secondaryValue: boolean;
	$: secondaryValue = nonNullish($$slots['secondary-value']);
</script>

<div class="mb-2 last:mb-0 md:items-center flex w-full justify-between">
	<label for={ref} class="mr-1 text-sm sm:mr-2 text-tertiary"><slot name="label" /></label>

	<div class="sm:flex-row sm:items-center flex flex-col items-end">
		<span class={`mb-1 text-sm font-bold sm:mb-0 ${secondaryValue ? 'sm:mr-2' : ''}`}
			><slot name="main-value" /></span
		>

		<span class="text-sm text-tertiary"><slot name="secondary-value" /></span>
	</div>
</div>
