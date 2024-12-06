<script lang="ts">
	export let href: string;
	export let selected = false;
	export let ariaLabel: string;
	export let testId: string | undefined = undefined;
</script>

<a
	{href}
	class="flex w-full flex-row gap-3 rounded-xl p-3 text-left no-underline hover:text-brand-primary"
	class:selected
	class:text-brand-primary={selected}
	aria-label={ariaLabel}
	data-tid={testId}
	on:click
>
	<slot />
</a>
