<script lang="ts">
	export let colorStyle: 'primary' | 'secondary' = 'primary';
	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let disabled = false;
</script>

<button class={`${colorStyle} block flex-1`} {type} {disabled} on:click>
	<slot />
</button>
