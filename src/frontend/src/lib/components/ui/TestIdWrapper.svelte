<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		testId: string;
		children: Snippet;
	}

	let { testId, children }: Props = $props();
</script>

<div class="contents" data-tid={testId}>
	{@render children()}
</div>

<style lang="scss">
	.contents {
		display: contents;
	}
</style>
