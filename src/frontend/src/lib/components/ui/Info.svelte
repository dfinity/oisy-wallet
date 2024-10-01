<script lang="ts">
	import { IconInfo } from '@dfinity/gix-components';
</script>

<div class="mb-4 flex items-center gap-4 rounded-lg bg-dark-blue p-4 text-off-white">
	<div class="min-w-5">
		<IconInfo size="20px" />
	</div>
	<div>
		<slot />
	</div>
</div>
