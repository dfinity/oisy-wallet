export enum SendStep {
	INITIALIZATION = 'initialization',
	SIGN = 'sign',
	SEND = 'send',
	APPROVE = 'approve',
	DONE = 'done'
}

export enum SignStep {
	INITIALIZATION = 'initialization',
	SIGN = 'sign',
	APPROVE = 'approve',
	DONE = 'done'
}

export enum LoaderStep {
	INITIALIZATION = 'initialization',
	ETH_ADDRESS = 'eth_address',
	DONE = 'done'
}

export enum AddTokenStep {
	INITIALIZATION = 'initialization',
	SAVE = 'save',
	UPDATE_UI = 'update_ui',
	DONE = 'done'
}

export enum HideTokenStep {
	INITIALIZATION = 'initialization',
	HIDE = 'hide',
	UPDATE_UI = 'update_ui',
	DONE = 'done'
}

export enum SendIcStep {
	INITIALIZATION = 'initialization',
	APPROVE = 'approve',
	SEND = 'send',
	RELOAD = 'reload',
	DONE = 'done'
}

export enum UpdateBalanceCkBtcStep {
	INITIALIZATION = 'initialization',
	RETRIEVE = 'retrieve',
	RELOAD = 'reload',
	DONE = 'done'
}
