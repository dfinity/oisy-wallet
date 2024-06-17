<script lang="ts">
	export let label: string;
	export let onClick: () => void;
	export let ariaLabel: string | undefined = undefined;
</script>

<button
	class={`flex gap-2 items-center no-underline hover:text-blue active:text-blue`}
	aria-label={ariaLabel ?? label}
	on:click={onClick}
>
	<slot name="before-label"></slot>
	{label}
	<slot name="after-label"></slot>
</button>
