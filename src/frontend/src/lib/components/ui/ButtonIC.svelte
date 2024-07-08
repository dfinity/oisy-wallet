<script lang="ts">
	import IconIcLogo from '$lib/components/icons/IconIcLogo.svelte';

	export let testId: string | undefined = undefined;
</script>

<button on:click class="ic" data-tid={testId}>
	<IconIcLogo />
	<span class="text-left">
		<span><slot name="action" /></span>
		<span><slot /></span>
	</span>
</button>
