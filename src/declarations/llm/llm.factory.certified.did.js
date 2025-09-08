// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const chat_message_v0 = IDL.Record({
		content: IDL.Text,
		role: IDL.Variant({
			user: IDL.Null,
			assistant: IDL.Null,
			system: IDL.Null
		})
	});
	const chat_request_v0 = IDL.Record({
		model: IDL.Text,
		messages: IDL.Vec(chat_message_v0)
	});
	const property = IDL.Record({
		enum: IDL.Opt(IDL.Vec(IDL.Text)),
		name: IDL.Text,
		type: IDL.Text,
		description: IDL.Opt(IDL.Text)
	});
	const parameters = IDL.Record({
		type: IDL.Text,
		properties: IDL.Opt(IDL.Vec(property)),
		required: IDL.Opt(IDL.Vec(IDL.Text))
	});
	const tool = IDL.Variant({
		function: IDL.Record({
			name: IDL.Text,
			parameters: IDL.Opt(parameters),
			description: IDL.Opt(IDL.Text)
		})
	});
	const tool_call_argument = IDL.Record({
		value: IDL.Text,
		name: IDL.Text
	});
	const assistant_message = IDL.Record({
		content: IDL.Opt(IDL.Text),
		tool_calls: IDL.Vec(
			IDL.Record({
				id: IDL.Text,
				function: IDL.Record({
					name: IDL.Text,
					arguments: IDL.Vec(tool_call_argument)
				})
			})
		)
	});
	const chat_message_v1 = IDL.Variant({
		tool: IDL.Record({ content: IDL.Text, tool_call_id: IDL.Text }),
		user: IDL.Record({ content: IDL.Text }),
		assistant: assistant_message,
		system: IDL.Record({ content: IDL.Text })
	});
	const chat_request_v1 = IDL.Record({
		model: IDL.Text,
		tools: IDL.Opt(IDL.Vec(tool)),
		messages: IDL.Vec(chat_message_v1)
	});
	const chat_response_v1 = IDL.Record({ message: assistant_message });
	return IDL.Service({
		v0_chat: IDL.Func([chat_request_v0], [IDL.Text], []),
		v1_chat: IDL.Func([chat_request_v1], [chat_response_v1], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	return [];
};
