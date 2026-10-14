import {ValueState} from "sap/ui/core/library";

interface RecipientToken {
	text: string;
}

/**
 * View-model shape for the Writing Assistant view. Kept separate from the
 * app-level `ViewModelData` so the Writing Assistant feature does not depend on
 * the main app's model types.
 */
interface WritingAssistantModelData {
	outputValue: string,
	outputValueState: ValueState,
	outputEnabled: boolean,
	outputLoading: boolean,
	outputCurrentVersion: number,
	outputTotalVersions: number,
	outputPromptDescription: string,
	buttonState: string,
	outputBusy: boolean,
	sendButtonEnabled: boolean,
	subject: string,
	recipients: RecipientToken[]
}

export {
	RecipientToken,
	WritingAssistantModelData
}
