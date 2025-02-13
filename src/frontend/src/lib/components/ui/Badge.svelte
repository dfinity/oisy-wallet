<script lang="ts">
	export let styleClass: string | undefined = undefined;
	export let testId: string | undefined = undefined;

	const variantClassNames = {
		default: 'border border-tertiary bg-dust/30',
		info: 'bg-brand-subtle text-brand-primary',
		error: 'bg-error-subtle text-error-primary',
		warning: 'bg-warning-subtle text-warning-primary',
		success: 'bg-success-subtle text-success-primary',
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
