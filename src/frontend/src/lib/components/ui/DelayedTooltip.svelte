<!-- DelayedTooltip.svelte -->
<script lang="ts">
    import { Tooltip } from '@dfinity/gix-components';
    import { onDestroy } from 'svelte';
  
    interface Props {
      text: string;
      delay?: number;
      onShow?: () => void;
      onHide?: () => void;
    }
    let { text, delay = 1500, onShow, onHide }: Props = $props();
  
    let visible = false;
    let timeout: ReturnType<typeof setTimeout>;
  
    function handleEnter() {
      timeout = setTimeout(() => {
        visible = true;
        onShow?.();
      }, delay);
    }
  
    function handleLeave() {
      clearTimeout(timeout);
      if (visible) {
        visible = false;
        onHide?.();
      }
    }
  
    onDestroy(() => clearTimeout(timeout));
  </script>
  
  <span
    role="button"
    tabindex="0"
    onmouseenter={handleEnter}
    onmouseleave={handleLeave}
    onfocus={handleEnter}
    onblur={handleLeave}
  >
    <Tooltip text={text} >
      <slot />
    </Tooltip>
  </span>
  