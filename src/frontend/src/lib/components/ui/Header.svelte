<script lang="ts">
	export let testId: string | undefined = undefined;
</script>

<div class="mb-6 flex items-center justify-between pb-1" data-tid={testId}>
	<h2 class="text-base"><slot /></h2>

	<slot name="end" />
</div>
