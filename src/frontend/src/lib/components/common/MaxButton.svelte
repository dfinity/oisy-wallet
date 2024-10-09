<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';

	export let disabled = false;
</script>

<button
	data-tid="max-button"
	type="button"
	on:click|preventDefault
	class="font-medium text-primary hover:text-inherit active:text-inherit"
	{disabled}
	class:opacity-50={disabled}
>
	{$i18n.core.text.max}
</button>
