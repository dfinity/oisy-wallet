<script lang="ts">
	import IconAstronautArrow from '$lib/components/icons/IconAstronautArrow.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<button
	on:click
	class="flex w-full items-center justify-center gap-4 rounded-2xl bg-[var(--color-primary)] py-3 text-lg font-bold leading-6 text-white sm:w-80 sm:px-12"
	data-tid="login-button"
>
	{$i18n.core.text.open}
	<span>|</span>
	{$i18n.core.text.create}
	<IconAstronautArrow />
</button>
