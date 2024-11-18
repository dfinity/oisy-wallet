<script lang="ts">
	import { nonNullish } from '@dfinity/utils';

	export let minHeight: string | undefined = undefined;
</script>

<div class={`stretch flex flex-col ${nonNullish(minHeight) ? `min-h-[${minHeight}]` : ''}`}>
	<slot />
</div>

<slot name="outer-content" />

<div class="flex w-full">
	<slot name="toolbar" />
</div>
