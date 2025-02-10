<script lang="ts">
	export let ariaLabel: string;
	export let styleClass: string | undefined = undefined;
</script>

<button
	aria-label={ariaLabel}
	class={`${styleClass ?? ''} hover:text-brand-primary active:text-brand-primary h-7 w-7 rounded-md bg-white p-1 shadow-sm transition-colors duration-700`}
	on:click
>
	<slot />
</button>
