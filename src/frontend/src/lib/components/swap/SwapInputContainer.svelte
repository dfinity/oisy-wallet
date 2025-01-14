<script lang="ts">
	export let focused = false;
	export let error = false;
	export let styleClass: string | undefined = '';
</script>

<div
	class={`flex w-full items-center rounded-lg border border-solid bg-primary shadow-inner ${styleClass ?? ''}`}
	class:border-brand-primary={focused && !error}
	class:border-tertiary={!focused && !error}
	class:border-error-solid={error}
>
	<slot />
</div>
