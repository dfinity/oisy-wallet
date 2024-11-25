<script lang="ts">
	import { nonNullish } from '@dfinity/utils';

	export let ref: undefined | string = undefined;

	let secondaryValue: boolean;
	$: secondaryValue = nonNullish($$slots['secondary-value']);
</script>

<div class="mb-2 flex w-full justify-between last:mb-0 md:items-center">
	<label for={ref} class="mr-1 text-sm sm:mr-2 sm:text-base"><slot name="label" /></label>

	<div class="flex flex-col items-end sm:flex-row sm:items-center">
		<span class={`mb-1 text-sm font-bold sm:mb-0 sm:text-base ${secondaryValue ? 'sm:mr-3' : ''}`}
			><slot name="main-value" /></span
		>

		<span class="text-sm text-tertiary"><slot name="secondary-value" /></span>
	</div>
</div>
