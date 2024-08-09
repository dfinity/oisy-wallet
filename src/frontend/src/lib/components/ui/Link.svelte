<script lang="ts">
	import { goto } from '$app/navigation';
	import { createEventDispatcher } from 'svelte';

	export let href: string;
	export let ariaLabel: string;
	export let external = false;
	export let iconVisible = true;
	export let inline = false;
	export let color: 'blue' | 'inherit' = 'inherit';
	export let fullWidth = false;

	const dispatch = createEventDispatcher();

	// Custom click handler to guarantee that it prevents default browser behaviour (full page reload)
	// when the link is internal (not external). A practical example is when the <a> tag is used
	// inside a Popover component.
	const onClick = () => {
		if (!external) {
			goto(href);
			dispatch('click');
		}
	};
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
	on:click|preventDefault={onClick}
>
	{#if iconVisible}
		<slot name="icon" />
	{/if}
	<slot />
</a>
