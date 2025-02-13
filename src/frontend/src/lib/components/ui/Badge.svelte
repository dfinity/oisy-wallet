<script lang="ts">
	export let styleClass: string | undefined = undefined;

	const variantClassNames = {
		default: 'bg-secondary border border-tertiary',
		info: 'bg-brand-subtle text-brand-primary',
		error: 'bg-error-subtle text-error',
		warning: 'bg-warning-subtle text-warning',
		success: 'bg-success-subtle text-success',
		outline: 'border border-tertiary bg-off-white'
	};

	export let variant: keyof typeof variantClassNames = 'default';
</script>

<span
	class="gap-1 rounded px-2 py-0.5 text-xs font-semibold inline-flex h-fit w-full items-center {variantClassNames[
		variant
	]} {styleClass ?? ''}"
>
	<span class="min-w-0 inline-block truncate">
		<slot />
	</span>
</span>
