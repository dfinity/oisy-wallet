<script lang="ts">
	import type { Snippet } from 'svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { MOBILE_NAVIGATION_MENU } from '$lib/constants/test-ids.constants';
	import { bottomSheetOpenStore } from '$lib/stores/ui.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<Responsive down="md">
	<div
		class="mobile-nav visible fixed right-0 bottom-0 left-0 z-12 flex flex-row md:hidden"
		class:hidden={$bottomSheetOpenStore}
		data-tid={MOBILE_NAVIGATION_MENU}
	>
		<!-- White background carved with a concave notch around the raised center
		     cradle. It lives on a masked layer BEHIND the buttons (negative z) so the
		     buttons/cradle are not clipped by the mask. -webkit-mask is required for
		     iOS Safari. -->
		<div
			class="pointer-events-none absolute inset-0 -z-[1] border-t-1 border-tertiary bg-primary-inverted-alt [-webkit-mask-image:radial-gradient(circle_28px_at_50%_0,transparent_27px,black_28px)] [mask-image:radial-gradient(circle_28px_at_50%_0,transparent_27px,black_28px)]"
		></div>
		{@render children()}
	</div>
</Responsive>
