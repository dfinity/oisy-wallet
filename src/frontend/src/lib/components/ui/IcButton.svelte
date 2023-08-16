<script lang="ts">
	import IconIcLogo from '$lib/components/icons/IconIcLogo.svelte';
</script>

<button on:click class="primary">
	<IconIcLogo />
	<span>
		<span><slot name="action" /></span>
		<span><slot /></span>
	</span>
</button>
