export interface PowProtectorWorkerInitResult {
	start: () => void;
	stop: () => void;
	trigger: () => void;
}

export type IcCkWorker = () => Promise<PowProtectorWorkerInitResult>;
