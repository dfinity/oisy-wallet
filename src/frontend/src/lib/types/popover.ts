export type PopoverDirection = 'ltr' | 'rtl';

// Which side of the anchor the panel opens on. `below` is every popover in the
// app; `above` exists for anchors pinned to the bottom of the viewport, where a
// panel opened downward would have nowhere to go.
export type PopoverPlacement = 'below' | 'above';
