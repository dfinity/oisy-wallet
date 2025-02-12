<script lang="ts">
	export let testId: string | undefined = undefined;
</script>

<div class="mb-2 gap-3 flex w-full" data-tid={testId}>
	<slot />
</div>
