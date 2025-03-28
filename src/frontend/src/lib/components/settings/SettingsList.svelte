<script lang="ts">
	import { nonNullish } from '@dfinity/utils';

	let hasTitleSlot: boolean;
	$: hasTitleSlot = nonNullish($$slots['title']);
</script>

{#if hasTitleSlot}
	<div class="flex w-full flex-row justify-between">
		<h5 class="mb-4 flex"><slot name="title" /></h5>
		<div><slot name="title-action" /></div>
	</div>
{/if}

<div class="mb-8 flex flex-col px-1">
	<slot />
</div>
