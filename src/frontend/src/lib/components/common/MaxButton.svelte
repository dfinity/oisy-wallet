<script lang="ts">
	import { MAX_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	export let disabled = false;
</script>

<button
	data-tid={MAX_BUTTON}
	type="button"
	on:click|preventDefault
	class="font-medium text-brand-primary hover:text-inherit active:text-inherit"
	{disabled}
	class:opacity-50={disabled}
>
	{$i18n.core.text.max}
</button>
