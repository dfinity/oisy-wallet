import type { ToastMsg as ToastMsgUI } from "@dfinity/gix-components";

export type ToastLevel = 'info' | 'warn' | 'error';

export interface ToastMsg {
	text: string;
	level: ToastLevel;
	detail?: string;
	duration?: number;
}

export type ToastMsgUIUI = Omit<ToastMsgUI, "id">;