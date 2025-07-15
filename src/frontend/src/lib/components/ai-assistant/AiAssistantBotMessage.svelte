<script lang="ts">
	import { Markdown } from '@dfinity/gix-components';

	interface Props {
		content: string;
	}

	let { content }: Props = $props();
</script>

<div class="message mb-5 w-full overflow-hidden text-sm">
	<Markdown text={content} />
</div>

<style lang="scss">
	:global(.message ol, .message ul) {
		list-style: auto;
	}

	:global(.message li) {
		list-style-position: inside;
	}
</style>
