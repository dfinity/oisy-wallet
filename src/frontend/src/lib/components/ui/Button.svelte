<script lang="ts">
	export let color: 'primary' | 'secondary' = 'primary';
	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let disabled = false;
</script>

<button
	class="block flex-1"
	{type}
	{disabled}
	on:click
	class:primary={color === 'primary'}
	class:secondary={color === 'secondary'}
>
	<slot />
</button>
