<script lang="ts">
	export let focused = false;
	export let error = false;
	export let styleClass: string | undefined = '';
</script>

<div
	class={`rounded-lg shadow-inner flex w-full items-center border border-solid bg-primary ${styleClass ?? ''}`}
	class:border-brand-primary={focused && !error}
	class:border-tertiary={!focused && !error}
	class:border-error-solid={error}
>
	<slot />
</div>
