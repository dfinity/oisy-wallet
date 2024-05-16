<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';

	export let disabled = false;
</script>

<button
	data-tid="max-button"
	type="button"
	on:click|preventDefault
	class="text-blue hover:text-dark-blue active:text-dark-blue font-medium"
	{disabled}
>
	{$i18n.core.text.max}
</button>
