<script lang="ts">
	export let styleClass: string | undefined = undefined;

	const variantClassNames = {
		default: 'border border-light-grey bg-dust/30',
		info: 'bg-light-blue text-blue-ribbon',
		error: 'bg-rusty-red/20 text-rusty-red',
		warning: 'bg-warning-orange text-american-orange',
		success: 'bg-green-crayola/20 text-green-crayola',
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
