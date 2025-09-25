/* eslint-disable @typescript-eslint/no-unsafe-call */
import BaseController from "ai/integration/controller/BaseController";
import XMLView from "sap/ui/core/mvc/XMLView";
import Log from "sap/base/Log";
import PredefinedTexts from "../model/types";

// UI5 Web Components
import WebCButton from "@ui5/webcomponents/dist/Button";
import WebCDialog from "@ui5/webcomponents/dist/Dialog";
import WebCPopover from "@ui5/webcomponents/dist/Popover";
import WebCTextArea from "@ui5/webcomponents/dist/TextArea";
import {ValueState} from "sap/ui/core/library";
import { ShellBar$NotificationsClickEvent } from "sap/ui/webc/fiori/ShellBar";
import WebCToast from "@ui5/webcomponents/dist/Toast";
import WebCMenu from "@ui5/webcomponents/dist/Menu";
import AIButton$clickEvent from "@ui5/webcomponents-ai/dist/Button";
import WebCAIButton from "@ui5/webcomponents-ai/dist/Button";


/**
 * @namespace ai.integration.controller
 */
export default class App extends BaseController {
	generationId: number = undefined;
	generationStopped: boolean = false;
	text: PredefinedTexts = null;
	translationKey: string = "en";
	currentTextKey: string;

	/**
	 * Called when the controller is instantiated.
	 */
	async onInit() {
		Log.setLevel(Log.Level.ERROR);
		const response  = await fetch("https://ui5.github.io/webcomponents/nightly/data/predefinedTexts.json");
		this.text = await response.json();
		this.applyContentDensity();
	}

	onAfterRendering() {}

	/**
	 * Applies the content density mode to the view.
	 */
	applyContentDensity(): void {
		this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
	}

	/**
	 * Called when opening the notifications popover.
	 */
	onNotificationsClick(e: ShellBar$NotificationsClickEvent): void {
		const view = this.getView().byId("notificationsView") as XMLView;
		const popover = view.byId("notificationsPopover").getDomRef() as WebCPopover;

		e.preventDefault();
		popover.opener = e.getParameter("targetRef");
		popover.open = true;
	}

	onDialogOkButton(): void {
		let acknowledgementDialog = this.getView().byId("acknowledgementDialog") as unknown as WebCDialog;
		// @ts-expect-error: setOpen is not in the type but exists at runtime
		acknowledgementDialog.setOpen(false)
	}

	onDialogCancelButton(): void {
		let acknowledgementDialog = this.getView().byId("acknowledgementDialog") as unknown as WebCDialog;
		// @ts-expect-error: setOpen is not in the type but exists at runtime
		acknowledgementDialog.setOpen(false)
	}

	aiQuickPromptButtonClickHandler(): void {
		const button = this.getView().byId("quickPromptButton") as unknown as WebCAIButton;
		const sendButton = this.getView().byId("footerBtnSend").getDomRef() as HTMLElement as WebCButton;
		const predefinedTexts = this.text.predefinedTexts;
		const menu = this.getView().byId("reviseMenu") as unknown as WebCMenu;

		// @ts-expect-error: getState is not in the type but exists at runtime
		switch(button.getState()) {
			case "":
			case "generate":
				// @ts-expect-error: setState is not in the type but exists at runtime
				button.setState("generating");
				sendButton.disabled = true;
				this.startQuickPromptGeneration(button);
				const keys = Object.keys(predefinedTexts[this.translationKey]);
				const randomKey = keys[Math.floor(Math.random() * keys.length)];
				this.currentTextKey = randomKey;
				this.generateText(predefinedTexts[this.translationKey][randomKey], button);
				break;
			case "generating":
				// @ts-expect-error: setState is not in the type but exists at runtime
				button.setState("revise");
				this.stopQuickPromptGeneration();
				break;
			case "revise":
				// @ts-expect-error: setOpener is not in the type but exists at runtime
				menu.setOpener(button.getDomRef() as HTMLElement);
				// @ts-expect-error: setOpen is not in the type but exists at runtime
				menu.setOpen(true);
				break;
			case "reviseGenerating":
				// @ts-expect-error: setOpen is not in the type but exists at runtime
				button.setState("revise");
				this.stopQuickPromptGeneration();
				break;
		}
	}

	startQuickPromptGeneration(button: WebCAIButton): void {
		console.warn("startGeneration");
		this.generationStopped = false;
		this.generationId = setTimeout(function() {
			console.warn("Generation completed");
			button.state = "revise";
		}, 2000);
	}

	generateText(text: string, button: WebCAIButton): void {
		if (this.generationId) {
			clearInterval(this.generationId);
		}

		const output = this.getView().byId("output") as unknown as WebCTextArea;
		// @ts-expect-error: setValue and getValue is not in the type but exists at runtime
		output.setEnabled(false);
		const words = text.split(" ");
		const sendButton = this.getView().byId("footerBtnSend") as unknown as WebCAIButton;
		let currentWordIndex = 0;
		// @ts-expect-error: setText is not in the type but exists at runtime
		output.setValue("");

		this.generationId = setInterval(() => {
			if (currentWordIndex < words.length) {
				// @ts-expect-error: setValue and getValue is not in the type but exists at runtime
				output.setValue(`${output.getValue()}${words[currentWordIndex]} `, true);
				currentWordIndex++;
				// @ts-expect-error: setText is not in the type but exists at runtime
				sendButton.setEnabled(false);
				// @ts-expect-error: setEnabled and getValue is not in the type but exists at runtime
				output.setEnabled(false);
			} else {
				if (!this.generationStopped) {
					// @ts-expect-error: setState is not in the type but exists at runtime
					button.setState("revise");
				}
				clearInterval(this.generationId);
				// @ts-expect-error: setEnabled and getValue is not in the type but exists at runtime
				sendButton.setEnabled(true);
				// @ts-expect-error: setEnabled and getValue is not in the type but exists at runtime
				output.setEnabled(true);
			}
		}, 75);
	}

	stopQuickPromptGeneration(): void {
		const sendButton = this.getView().byId("footerBtnSend") as unknown as WebCAIButton;
		const output = this.getView().byId("output") as unknown as WebCTextArea  //document.getElementById("output");
		console.warn("stopGeneration");
		clearInterval(this.generationId);
		this.generationStopped = true;
		// @ts-expect-error: setEnabled and getValue is not in the type but exists at runtime
		sendButton.setEnabled(true);
		// @ts-expect-error: setEnabled and getValue is not in the type but exists at runtime
		output.setEnabled(true);

	}

	setStateAndGenerate(button: WebCAIButton, state: string, textKey: string, predefinedTexts: object): void {
		// @ts-expect-error: setState is not in the type but exists at runtime
		button.setState(state);
		this.startQuickPromptGeneration(button);
		this.generateText(predefinedTexts[this.translationKey][textKey], button);
	}

	startTextGeneration(button: WebCAIButton, state: string, predefinedTexts: object): void {
		// @ts-expect-error: setState is not in the type but exists at runtime
		button.setState(state);
		this.startQuickPromptGeneration(button);
		this.generateText(predefinedTexts[this.translationKey][this.currentTextKey], button);
	}

	clearValueState(output: WebCTextArea ) : void {
		// @ts-expect-error: setValueState is not in the type but exists at runtime
		output.setValueState(ValueState.None);
	}

	setNegativeValueState(output: WebCTextArea) : void {
		// @ts-expect-error: setValueState is not in the type but exists at runtime
		output.setValueState(ValueState.Error);
	}

	fixSpellingAndGrammar(button: WebCAIButton, output: WebCTextArea, predefinedTexts: object) : void {
		if (this.isTextWrong(output, predefinedTexts)) {
			this.setStateAndGenerate(button, "generating", this.currentTextKey, predefinedTexts);
			this.setNegativeValueState(output);
		} else {
			// @ts-expect-error: setValueState is not in the type but exists at runtime
			output.setValueState(ValueState.Success);
			setTimeout(() => {
				// @ts-expect-error: setValueState is not in the type but exists at runtime
				output.setValueState(ValueState.None);
			}, 3000);
		}
	}

	isTextWrong(output: WebCTextArea, predefinedTexts: object) : boolean {
		const predefinedTextsBulleted = this.text.predefinedTextsBulleted;
		const predefinedTextsExpanded = this.text.predefinedTextsExpanded;
		const predefinedTextsRephrased = this.text.predefinedTextsRephrased;
		const predefinedTextsSimplified = this.text.predefinedTextsSimplified;
		// @ts-expect-error: getValue is not in the type but exists at runtime
		return output.getValue().trim() !== predefinedTexts[this.translationKey][this.currentTextKey]
			// @ts-expect-error: getValue is not in the type but exists at runtime
			&& output.getValue().trim() !== predefinedTextsExpanded[this.translationKey][this.currentTextKey]
			// @ts-expect-error: getValue is not in the type but exists at runtime
			&& output.getValue().trim() !== predefinedTextsBulleted[this.translationKey][this.currentTextKey]
			// @ts-expect-error: getValue is not in the type but exists at runtime
			&& output.getValue().trim() !== predefinedTextsRephrased[this.translationKey][this.currentTextKey]
			// @ts-expect-error: getValue is not in the type but exists at runtime
			&& output.getValue().trim() !== predefinedTextsSimplified[this.translationKey][this.currentTextKey];
	}

	reviseMenuItemClickHandler(event: AIButton$clickEvent):void {
		const button = this.getView().byId("quickPromptButton") as unknown as WebCAIButton;;
		const predefinedTexts = this.text?.predefinedTexts;
		const predefinedTextsBulleted = this.text.predefinedTextsBulleted;
		const predefinedTextsExpanded = this.text.predefinedTextsExpanded;
		const predefinedTextsRephrased = this.text.predefinedTextsRephrased;
		const predefinedTextsSimplified = this.text.predefinedTextsSimplified;
		const predefinedTextsSummarized = this.text.predefinedTextsSummarized;
		const output = this.getView().byId("output") as unknown as WebCTextArea;

		switch (event.getParameter("text")) {
			case "Regenerate":
				const keys = Object.keys(predefinedTexts[this.translationKey]);
				const randomKey = keys[Math.floor(Math.random() * keys.length)];
				this.currentTextKey = randomKey;
				this.setStateAndGenerate(button, "generating", randomKey, predefinedTexts);
				break;
			case "Make Bulleted List":
				this.startTextGeneration(button, "reviseGenerating", predefinedTextsBulleted);
				break;
			case "Clear Error":
				this.clearValueState(output);
				break;
			case "Fix Spelling and Grammar":
				this.fixSpellingAndGrammar(button, output, predefinedTexts);
				break;
			case "Generate Error":
				this.setNegativeValueState(output);
				break;
			case "Simplify":
				this.startTextGeneration(button, "reviseGenerating", predefinedTextsSimplified);
				break;
			case "Expand":
				this.startTextGeneration(button, "reviseGenerating", predefinedTextsExpanded);
				break;
			case "Rephrase":
				this.startTextGeneration(button, "reviseGenerating", predefinedTextsRephrased);
				break;
			case "Summarize":
				this.startTextGeneration(button, "reviseGenerating", predefinedTextsSummarized);
				break;
			case "Bulgarian":
				this.translationKey = "bg";
				this.startTextGeneration(button, "reviseGenerating", predefinedTexts);
				break;
			case "English":
				this.translationKey = "en";
				this.startTextGeneration(button, "reviseGenerating", predefinedTexts);
				break;
			case "German":
				this.translationKey = "de";
				this.startTextGeneration(button, "reviseGenerating", predefinedTexts);
				break;
		}
	}

	sendTextHandler(event:any):void {
		const output = this.getView().byId("output") as unknown as WebCTextArea;
		const toast = this.getView().byId("quickPromptToast") as unknown as WebCToast;

		// @ts-expect-error: getValue is not in the type but exists at runtime
		if (output.getValue()) {
			// @ts-expect-error: setOpen is not in the type but exists at runtime
			toast.setOpen(true);
			// @ts-expect-error: setValueState is not in the type but exists at runtime
			output.setValueState(ValueState.None);
			// @ts-expect-error: setValue is not in the type but exists at runtime
			output.setValue("");
		}
	}

}
