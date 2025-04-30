<script lang="ts">
	import type {Snippet} from "svelte";

	interface Props {
		children: Snippet;
		testId?: string | undefined
	}

	let {children, testId = undefined}: Props = $props();
</script>

<div class="mb-2 flex w-full gap-3" data-tid={testId}>
	{@render children?.()}
</div>
