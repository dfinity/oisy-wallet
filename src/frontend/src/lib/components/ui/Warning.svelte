<script>
import {IconWarning} from "@dfinity/gix-components";
</script>

<div class="bg-blue text-off-white rounded-lg p-4 mb-4 flex gap-2">
    <IconWarning size="44px" />
    <div>
        <slot />
    </div>
</div>