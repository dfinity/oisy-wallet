<script lang="ts">
	export let variant: 'default' | 'info' | 'error' | 'warning' | 'success' | 'outline' = 'default';
	export let styleClass: string | undefined = undefined;

	const variantClassNames = {
		default: 'border border-light-grey bg-dust/30',
		info: 'bg-light-blue text-blue-ribbon',
		error: 'bg-rusty-red/20 text-rusty-red',
		warning: 'bg-american-orange/20 text-american-orange',
		success: 'bg-green-crayola/20 text-green-crayola',
		outline: 'border border-light-grey bg-off-white'
	};
</script>

<div
	class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold {variantClassNames[
		variant
	]} {styleClass ?? ''}"
>
	<slot />
</div>
