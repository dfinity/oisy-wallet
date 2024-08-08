<script lang="ts">
	export let href: string | null;
	export let ariaLabel: string;
	export let external = false;
	export let iconVisible = true;
	export let inline = false;
	export let color: 'blue' | 'inherit' = 'inherit';
	export let fullWidth = false;
</script>

<a
	{href}
	rel={external ? 'external noopener noreferrer' : undefined}
	target={external ? '_blank' : undefined}
	class="inline-flex gap-2 items-center no-underline"
	aria-label={ariaLabel}
	style={inline ? 'vertical-align: sub;' : ''}
	class:text-blue={color === 'blue'}
	class:hover:text-dark-blue={color === 'blue'}
	class:active:text-dark-blue={color === 'blue'}
	class:hover:text-blue={color === 'inherit'}
	class:active:text-blue={color === 'inherit'}
	class:w-full={fullWidth}
	on:click
>
	{#if iconVisible}
		<slot name="icon" />
	{/if}
	<slot />
</a>
