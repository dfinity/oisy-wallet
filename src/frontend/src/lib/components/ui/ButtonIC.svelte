<script lang="ts">
	export let testId: string | undefined = undefined;
</script>

<button on:click class="primary full center max-w-72" data-tid={testId}>
	<span><slot /></span>
</button>
