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

	const transform = async (text: string) => {
		try {
			html = await markdownToHTML(text);
		} catch (err: unknown) {
			consoleError('Failed to render markdown', err);
			error = true;
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
