<script lang="ts">
	import { MOBILE_NAVIGATION_MENU } from '$lib/constants/test-ids.constants';
</script>

<div
	class="mobile-nav z-2 border-t-1 visible fixed bottom-0 left-0 right-0 flex flex-row border-tertiary bg-primary-inverted-alt md:hidden"
	data-tid={MOBILE_NAVIGATION_MENU}
>
	<slot />
</div>
