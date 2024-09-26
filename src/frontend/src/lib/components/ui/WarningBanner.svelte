<script lang="ts">
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
</script>

<div
	class="inline-flex w-full items-center justify-center gap-2 px-6 py-2 text-xs font-bold sm:w-fit md:text-base text-american-orange bg-cornsilk border border-crayola-yellow rounded-lg"
>
	<IconWarning inline />
	<span><slot /></span>
</div>
