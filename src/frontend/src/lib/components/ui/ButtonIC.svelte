<script lang="ts">
	import IconIcLogo from '$lib/components/icons/IconIcLogo.svelte';
</script>

<button
	on:click
	class="primary labelled"
	style="padding: var(--padding) var(--padding-4x) var(--padding) var(--padding-2x)"
>
	<IconIcLogo />
	<span>
		<span><slot name="action" /></span>
		<span><slot /></span>
	</span>
</button>
