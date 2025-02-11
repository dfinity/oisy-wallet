<script lang="ts">
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
</script>

<div
	class="gap-2 rounded-lg px-6 py-2 text-xs font-bold sm:w-fit md:text-base inline-flex w-full items-center justify-center border border-crayola-yellow bg-cornsilk text-warning"
>
	<IconWarning inline />
	<span><slot /></span>
</div>
