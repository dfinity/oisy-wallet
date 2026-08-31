<script lang="ts">
	import { slide } from 'svelte/transition';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import type { ProgramUi } from '$lib/types/program';

	interface Props {
		program: ProgramUi;
	}

	const { program }: Props = $props();
</script>

<span class="inline-flex min-w-0 items-center gap-1" in:slide={SLIDE_PARAMS}>
	<span class="shrink-0">
		<Logo alt={program.name} size="xxs" src={program.icon} />
	</span>

	<span class="flex min-w-0 flex-wrap items-center">
		<span class="inline-block max-w-38 truncate">
			{program.name}
		</span>
	</span>
</span>
