<script lang="ts">
	export let href: string;
	export let selected = false;
	export let ariaLabel: string;
</script>

<a
	{href}
	class="flex w-full flex-row gap-3 rounded-xl p-3 text-left no-underline transition-colors duration-700 hover:text-brand-primary"
	class:text-brand-primary={selected}
	class:bg-white={selected}
	class:hover:bg-brand-subtle-alt={selected}
	aria-label={ariaLabel}
>
	<slot />
</a>
