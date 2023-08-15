<script lang="ts">
	import IcLogo from '$lib/components/icons/IcLogo.svelte';
</script>

<button on:click>
	<IcLogo />
	<span>
		<span><slot name="action" /></span>
		<span><slot /></span>
	</span>
</button>
