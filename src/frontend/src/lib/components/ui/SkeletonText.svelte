<script lang="ts">
	import { isIOS } from '@dfinity/gix-components';
	import { TOKEN_SKELETON_TEXT } from '$lib/constants/test-ids.constants';
</script>

<div aria-hidden="true">
	<div
		class="bg-disabled-alt h-4 w-full rounded-md"
		class:animate-pulse={!isIOS()}
		data-tid={TOKEN_SKELETON_TEXT}
	></div>
</div>
