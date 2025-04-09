<script lang="ts">
	import { Collapsible } from '@dfinity/gix-components';
	import { fade } from 'svelte/transition';
</script>

<div in:fade class="modal-expandable-values">
	<Collapsible>
		<!-- The width of the item below should be 100% - collapsible expand button width (1.5rem) -->
		<div class="flex w-[calc(100%-1.5rem)] items-center" slot="header">
			<slot name="list-header" />
		</div>

		<slot name="list-items" />
	</Collapsible>
</div>

<style lang="scss">
	:global(.modal-expandable-values > div.contents > div.header > button.collapsible-expand-icon) {
		justify-content: flex-end;
	}
</style>
