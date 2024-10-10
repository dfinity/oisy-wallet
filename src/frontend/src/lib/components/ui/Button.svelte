<script lang="ts">
	export let colorStyle: 'primary' | 'secondary' = 'primary';
	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let disabled = false;
	export let testId: string | undefined = undefined;
</script>

<button
	class={`${colorStyle} block flex-1`}
	data-tid={testId}
	{type}
	{disabled}
	on:click
>
	<slot />
</button>
