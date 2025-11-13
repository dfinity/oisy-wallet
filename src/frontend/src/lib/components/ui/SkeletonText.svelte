<script lang="ts">
	import { TOKEN_SKELETON_TEXT } from '$lib/constants/test-ids.constants';
	import { isIos } from '$lib/utils/device.utils';
</script>

<div aria-hidden="true">
	<div
		class="h-4 w-full rounded-md bg-disabled-alt"
		class:animate-pulse={!isIos()}
		data-tid={TOKEN_SKELETON_TEXT}
	></div>
</div>
