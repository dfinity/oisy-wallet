<script lang="ts">
	import IconAstronautArrow from '$lib/components/icons/IconAstronautArrow.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let fullWidth = false;
</script>

<button
	on:click
	class="flex w-full items-center justify-center gap-4 rounded-2xl bg-background-brand-primary py-3 text-lg font-bold leading-6 text-white sm:px-12"
	class:sm:w-80={!fullWidth}
	data-tid="login-button"
>
	{$i18n.auth.text.authenticate}
	<IconAstronautArrow />
</button>
