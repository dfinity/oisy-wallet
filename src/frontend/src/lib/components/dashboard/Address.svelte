<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { Copy } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
</script>

<div class="text-ghost-white mt-8 flex gap-1">
	{#if nonNullish($addressStore)}
		<output>{shortenWithMiddleEllipsis($addressStore ?? '')}</output><Copy
			value={shortenWithMiddleEllipsis($addressStore ?? '')}
		/>
	{/if}
</div>
