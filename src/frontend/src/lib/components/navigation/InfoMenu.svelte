<script lang="ts">
	import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
	import ChangelogLink from '$lib/components/navigation/ChangelogLink.svelte';
	import DocumentationLink from '$lib/components/navigation/DocumentationLink.svelte';
	import { HOME_PAGE_ROUTE } from '$lib/constants/analytics.contants';
</script>

<div class="pb-18 box-content flex w-full flex-col gap-1 pt-3">
	<AboutWhyOisy asMenuItem trackEventSource={HOME_PAGE_ROUTE} />

	<DocumentationLink asMenuItem trackEventSource={HOME_PAGE_ROUTE} />

	<ChangelogLink asMenuItem trackEventSource={HOME_PAGE_ROUTE} />
</div>
