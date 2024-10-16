<script lang="ts">
	import { Spinner } from '@dfinity/gix-components';
</script>

<div class="flex min-h-full flex-1 flex-col items-center justify-center gap-3">
	<div class="text-[var(--color-primary)]">
		<Spinner inline />
	</div>
	<span><slot /></span>
</div>
