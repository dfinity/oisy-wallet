<script lang="ts">
	export let testId: string | undefined = undefined;
</script>

<div class="mb-2 flex w-full gap-3" data-tid={testId}>
	<slot />
</div>
