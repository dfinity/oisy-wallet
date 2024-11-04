<script lang="ts">
	export let styleClass: string | undefined = undefined;

	const variantClassNames = {
		default: 'border border-light-grey bg-dust/30',
		info: 'bg-background-brand-subtle text-foreground-brand-primary',
		error: 'bg-background-error-subtle text-foreground-error',
		warning: 'bg-background-warning-subtle text-foreground-warning',
		success: 'bg-background-success-subtle text-foreground-success',
		outline: 'border border-light-grey bg-off-white'
	};

	export let variant: keyof typeof variantClassNames = 'default';
</script>

<span
	class="inline-flex h-fit w-full items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold {variantClassNames[
		variant
	]} {styleClass ?? ''}"
>
	<span class="inline-block min-w-0 truncate">
		<slot />
	</span>
</span>
