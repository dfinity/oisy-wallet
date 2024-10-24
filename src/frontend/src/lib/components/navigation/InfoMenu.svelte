<script lang="ts">
	import AboutHow from '$lib/components/hero/about/AboutHow.svelte';
	import ChangelogLink from '$lib/components/navigation/ChangelogLink.svelte';
</script>

<div class="box-content flex w-full flex-col gap-5 py-3">
	<AboutHow asMenuItem />

	<ChangelogLink />
</div>
