<script lang="ts">
	export let ariaLabel: string;
	export let styleClass: string | undefined = undefined;
</script>

<button
	aria-label={ariaLabel}
	class={`${styleClass ?? ''} h-7 w-7 rounded-md bg-primary p-1 transition-colors duration-700 hover:text-brand-primary active:text-brand-primary`}
	on:click
>
	<slot />
</button>
