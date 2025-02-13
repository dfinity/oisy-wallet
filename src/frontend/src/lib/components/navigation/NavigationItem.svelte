<script lang="ts">
	export let href: string;
	export let selected = false;
	export let ariaLabel: string;
	export let testId: string | undefined = undefined;
</script>

<a
	{href}
	class="gap-3 rounded-xl p-3 flex w-full flex-row text-left no-underline transition-colors duration-700 hover:text-brand-primary"
	class:text-brand-primary={selected}
	class:bg-white={selected}
	class:hover:bg-brand-subtle-30={selected}
	aria-label={ariaLabel}
	data-tid={testId}
>
	<slot />
</a>
