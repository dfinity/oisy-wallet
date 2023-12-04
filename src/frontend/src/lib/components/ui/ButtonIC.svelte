<script lang="ts">
	import IconIcLogo from '$lib/components/icons/IconIcLogo.svelte';
</script>

<button on:click class="ic">
	<IconIcLogo />
	<span class="text-left">
		<span><slot name="action" /></span>
		<span><slot /></span>
	</span>
</button>
