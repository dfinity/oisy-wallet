<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { MAX_BUTTON } from '$lib/constants/test-ids.constants';

	export let disabled = false;
</script>

<button
	data-tid={MAX_BUTTON}
	type="button"
	on:click|preventDefault
	class="font-medium text-blue hover:text-dark-blue active:text-dark-blue"
	{disabled}
	class:opacity-50={disabled}
>
	{$i18n.core.text.max}
</button>
