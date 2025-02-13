<script lang="ts">
	export let styleClass: string | undefined = undefined;
	export let testId: string | undefined = undefined;

	const variantClassNames = {
		default: 'border border-tertiary bg-dust/30',
		info: 'bg-brand-subtle-20 text-brand-primary',
		error: 'bg-error-subtle-20 text-error',
		warning: 'bg-warning-subtle-20 text-warning',
		success: 'bg-success-subtle-20 text-success',
		outline: 'border border-tertiary bg-off-white'
	};

	export let variant: keyof typeof variantClassNames = 'default';
</script>

<span
	data-tid={testId}
	class="gap-1 rounded px-2 py-0.5 text-xs font-semibold inline-flex h-fit w-full items-center {variantClassNames[
		variant
	]} {styleClass ?? ''}"
>
	<span class="min-w-0 inline-block truncate">
		<slot />
	</span>
</span>
