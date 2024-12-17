<script lang="ts">
	export let testId: string | undefined = undefined;
	export let styleClass = '';
</script>

<div class={`mb-2 flex w-full gap-3 ${styleClass}`} data-tid={testId}>
	<slot />
</div>
