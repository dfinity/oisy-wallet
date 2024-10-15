<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';

	export let pending = false;
	export let unconfirmed = false;
</script>

{#if pending || unconfirmed}
	<span class="ml-2 text-goldenrod">
		{pending ? $i18n.transaction.text.pending : $i18n.transaction.text.unconfirmed}
	</span>
{/if}
