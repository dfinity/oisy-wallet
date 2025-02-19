<script lang="ts">
	import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
	import ChangelogLink from '$lib/components/navigation/ChangelogLink.svelte';
</script>

<div class="box-content flex w-full flex-col gap-1 py-3">
	<AboutWhyOisy asMenuItem />

	<ChangelogLink asMenuItem />
</div>
