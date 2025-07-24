<script lang="ts">
import { AVATAR_LOADER } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';

</script>

<!-- SCRIPT_LOADER -->
<div 
    class="avatar-spinner-overlay" 
    role="status" 
    data-tid={AVATAR_LOADER}
	aria-label={$i18n.address_book.avatar.avatar_loading} >
	<svg
        id="app-spinner"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
        aria-hidden="true"
        data-tid="spinner"
        viewBox="0 0 100 100"
	>
		<circle cx="50%" cy="50%" r="45" />
	</svg>
</div>