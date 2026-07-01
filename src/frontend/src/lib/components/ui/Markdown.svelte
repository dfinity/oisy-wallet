<script lang="ts">
	import Html from '$lib/components/ui/Html.svelte';
	import LoaderSpinner from '$lib/components/ui/LoaderSpinner.svelte';
	import { consoleError } from '$lib/utils/console.utils';
	import { markdownToHTML } from '$lib/utils/markdown.utils';

	interface Props {
		text: string | undefined;
	}

	let { text }: Props = $props();

	let html = $state<string | undefined>();
	let error = $state(false);
	// Guards against a stale render: if `text` changes while an earlier transform is still pending,
	// the older (now superseded) result must not overwrite the newer one.
	let latestRequest = 0;

	const transform = async (value: string) => {
		const requestId = ++latestRequest;
		try {
			const rendered = await markdownToHTML(value);
			if (requestId === latestRequest) {
				html = rendered;
				error = false;
			}
		} catch (err: unknown) {
			if (requestId === latestRequest) {
				consoleError('Failed to render markdown', err);
				error = true;
			}
		}
	};

	$effect(() => {
		if (text !== undefined) {
			transform(text).then();
		}
	});
</script>

{#if error}
	<p data-tid="markdown-text">{text}</p>
{:else if html === undefined}
	<LoaderSpinner inline />
{:else}
	<Html text={html} />
{/if}
