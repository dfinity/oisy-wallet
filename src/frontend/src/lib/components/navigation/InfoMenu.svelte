<script lang="ts">
	import ChangelogLink from '$lib/components/navigation/ChangelogLink.svelte';
	import AboutWhyOisy from '$lib/components/hero/about/AboutWhyOisy.svelte';
</script>

<div class="box-content flex w-full flex-col gap-5 py-3">
	<AboutWhyOisy asMenuItem />

	<ChangelogLink />
</div>
