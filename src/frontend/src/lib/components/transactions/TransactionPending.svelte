<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';

	export let pending = false;
</script>

{#if pending}
	<span class="text-goldenrod">
		{$i18n.transaction.text.pending}
	</span>
{/if}
