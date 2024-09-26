<script lang="ts">
	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let disabled = false;
</script>

<button class="primary block flex-1" {type} {disabled} on:click>
	<slot />
</button>
