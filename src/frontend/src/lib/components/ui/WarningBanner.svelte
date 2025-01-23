<script lang="ts">
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
</script>

<div
	class="border-crayola-yellow bg-cornsilk text-warning inline-flex w-full items-center justify-center gap-2 rounded-lg border px-6 py-2 text-xs font-bold sm:w-fit md:text-base"
>
	<IconWarning inline />
	<span><slot /></span>
</div>
