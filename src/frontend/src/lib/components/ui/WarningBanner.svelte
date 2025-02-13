<script lang="ts">
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
</script>

<div
	class="gap-2 rounded-lg px-6 py-2 text-xs font-bold sm:w-fit md:text-base bg-warning-subtle-10 inline-flex w-full items-center justify-center border border-crayola-yellow text-warning-primary"
>
	<IconWarning inline />
	<span><slot /></span>
</div>
