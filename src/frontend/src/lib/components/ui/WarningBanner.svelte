<script lang="ts">
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
</script>

<div
	class="gap-2 rounded-lg px-6 py-2 text-xs font-bold md:text-base inline-flex w-full items-center justify-center border border-warning-solid bg-warning-subtle-10 text-warning-primary sm:w-fit"
>
	<IconWarning inline />
	<span><slot /></span>
</div>
