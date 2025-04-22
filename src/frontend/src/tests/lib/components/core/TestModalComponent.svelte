<script lang="ts">
	let { testProp = '' } = $props();

	export { titleSnippet, toolbarSnippet };
</script>

{#snippet titleSnippet()}
	Test Title: {testProp}
{/snippet}

{#snippet toolbarSnippet()}
	Test Toolbar: {testProp}
{/snippet}

<div data-tid="test-modal-content">
	Test Modal Content: {testProp}
</div>
