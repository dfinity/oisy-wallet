<script lang="ts">
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
</script>

<div class="mb-4 flex items-center gap-4 rounded-xl bg-onahau px-4 py-3 text-sm sm:text-base">
	<div class="min-w-5 text-blue-ribbon">
		<IconInfo />
	</div>
	<div>
		<slot />
	</div>
</div>
