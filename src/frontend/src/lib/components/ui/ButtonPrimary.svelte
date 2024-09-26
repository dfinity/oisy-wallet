<script lang="ts">
	export let disabled = false;
</script>

<button class="primary block flex-1" {disabled} on:click>
	<slot />
</button>
