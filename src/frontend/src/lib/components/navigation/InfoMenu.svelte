<script lang="ts">
	import AboutHow from '$lib/components/hero/about/AboutHow.svelte';
	import AboutWhat from '$lib/components/hero/about/AboutWhat.svelte';
	import ChangelogLink from '$lib/components/navigation/ChangelogLink.svelte';
</script>

<div class="box-content flex w-full flex-col gap-5 py-3">
	<AboutHow asMenuItem />

	<AboutWhat asMenuItem />

	<ChangelogLink />
</div>
