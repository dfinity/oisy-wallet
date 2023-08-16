import type { ToastMsg as ToastMsgUI } from '@dfinity/gix-components';

export type ToastMsg = Omit<ToastMsgUI, 'id'>;
