export interface WebSocketListener {
	disconnect: () => Promise<void>;
}
