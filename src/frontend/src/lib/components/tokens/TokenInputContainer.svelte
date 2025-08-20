<script lang="ts">
	export let focused = false;
	export let error = false;
	export let styleClass: string | undefined = '';
</script>

<div
	class={`duration-250 flex w-full items-center rounded-lg border border-solid bg-primary shadow-inner transition-colors focus-within:border-2 ${styleClass ?? ''}`}
	class:border-brand-primary={focused && !error}
	class:border-error-solid={error}
	class:border-tertiary={!focused && !error}
	class:hover:border-brand-primary={!error}
>
	<slot />
</div>
