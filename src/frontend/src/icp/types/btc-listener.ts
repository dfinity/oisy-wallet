export interface BtcStatusesWorker {
	start: () => void;
	stop: () => void;
	trigger: () => void;
}
