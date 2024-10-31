<script lang="ts">
	export let ariaLabel: string;
	export let styleClass: string | undefined = undefined;
</script>

<button
	aria-label={ariaLabel}
	class={`${styleClass ?? ''} h-7 w-7 rounded-md bg-white p-1 shadow transition-colors duration-700 hover:text-foreground-brand-primary active:text-foreground-brand-primary`}
	on:click
>
	<slot />
</button>
