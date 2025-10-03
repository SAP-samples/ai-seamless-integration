/* eslint-disable @typescript-eslint/no-unsafe-call */
import BaseController from "ai/integration/controller/BaseController";
import XMLView from "sap/ui/core/mvc/XMLView";
import { PredefinedTextsData, PredefinedTexts} from "../model/types";

// UI5 Web Components
import Button from "@ui5/webcomponents/dist/Button";
import Dialog from "@ui5/webcomponents/dist/Dialog";
import Popover from "@ui5/webcomponents/dist/Popover";
import TextArea from "@ui5/webcomponents/dist/TextArea";
import {ValueState} from "sap/ui/core/library";
import { ShellBar$NotificationsClickEvent } from "sap/ui/webc/fiori/ShellBar";
import Toast from "@ui5/webcomponents/dist/Toast";
import Menu from "@ui5/webcomponents/dist/Menu";
import AIButton$clickEvent from "@ui5/webcomponents-ai/dist/Button";
import WebCAIButton from "@ui5/webcomponents-ai/dist/Button";
import LanguageCode from "../model/LanguageCode";


/**
 * @namespace ai.integration.controller
 */
export default class App extends BaseController {
	generationId: number;
	generationStopped: boolean = false;
	textObject: PredefinedTextsData = null;
	translationKey: string = LanguageCode.EN;
	currentTextKey: string;

	/**
	 * Called when the controller is instantiated.
	 */
	async onInit() {
		const response  = await fetch("https://ui5.github.io/webcomponents/nightly/data/predefinedTexts.json");
		this.textObject = await response.json();
		this.applyContentDensity();
	}

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
		const popover = view.byId("notificationsPopover").getDomRef() as Popover;

		e.preventDefault();
		popover.opener = e.getParameter("targetRef");
		popover.open = true;
	}

	onDialogOkButton(): void {
		const acknowledgementDialog = this.getView().byId("acknowledgementDialog") as unknown as Dialog;
		// @ts-expect-error: setOpen is not in the type but exists at runtime
		acknowledgementDialog.setOpen(false)
	}

	onDialogCancelButton(): void {
		const acknowledgementDialog = this.getView().byId("acknowledgementDialog") as unknown as Dialog;
		// @ts-expect-error: setOpen is not in the type but exists at runtime
		acknowledgementDialog.setOpen(false)
	}

	aiQuickPromptButtonClickHandler(): void {
		const button = this.getView().byId("quickPromptButton") as unknown as WebCAIButton;
		const sendButton = this.getView().byId("footerBtnSend") as unknown as Button;
		const predefinedTexts = this.textObject.predefinedTexts;
		const menu = this.getView().byId("reviseMenu") as unknown as Menu;

		// @ts-expect-error: getState is not in the type but exists at runtime
		switch(button.getState()) {
			case "":
			case "generate":
				// @ts-expect-error: setState is not in the type but exists at runtime
				button.setState("generating");
				// @ts-expect-error: setState is not in the type but exists at runtime
				sendButton.setEnable(false);
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
		this.generationStopped = false;
		this.generationId = setTimeout(function() {
			button.state = "revise";
		}, 2000);
	}

	generateText(text: string, button: WebCAIButton): void {
		if (this.generationId) {
			clearInterval(this.generationId);
		}

		const output = this.getView().byId("output") as unknown as TextArea;
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
		const output = this.getView().byId("output") as unknown as TextArea;

		clearInterval(this.generationId);
		this.generationStopped = true;
		// @ts-expect-error: setEnabled and getValue is not in the type but exists at runtime
		sendButton.setEnabled(true);
		// @ts-expect-error: setEnabled and getValue is not in the type but exists at runtime
		output.setEnabled(true);

	}

	setStateAndGenerate(button: WebCAIButton, state: string, textKey: string, predefinedTexts: PredefinedTexts): void {
		// @ts-expect-error: setState is not in the type but exists at runtime
		button.setState(state);
		this.startQuickPromptGeneration(button);
		this.generateText(predefinedTexts[this.translationKey][textKey], button);
	}

	startTextGeneration(button: WebCAIButton, state: string, predefinedTexts: PredefinedTexts): void {
		// @ts-expect-error: setState is not in the type but exists at runtime
		button.setState(state);
		this.startQuickPromptGeneration(button);
		this.generateText(predefinedTexts[this.translationKey][this.currentTextKey], button);
	}

	clearValueState(output: TextArea ) : void {
		// @ts-expect-error: setValueState is not in the type but exists at runtime
		output.setValueState(ValueState.None);
	}

	setNegativeValueState(output: TextArea) : void {
		// @ts-expect-error: setValueState is not in the type but exists at runtime
		output.setValueState(ValueState.Error);
	}

	fixSpellingAndGrammar(button: WebCAIButton, output: TextArea, predefinedTexts: PredefinedTexts) : void {
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

	isTextWrong(output: TextArea, predefinedTexts: PredefinedTexts) : boolean {
		const predefinedTextsBulleted = this.textObject.predefinedTextsBulleted;
		const predefinedTextsExpanded = this.textObject.predefinedTextsExpanded;
		const predefinedTextsRephrased = this.textObject.predefinedTextsRephrased;
		const predefinedTextsSimplified = this.textObject.predefinedTextsSimplified;
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
		const predefinedTexts = this.textObject?.predefinedTexts;
		const predefinedTextsBulleted = this.textObject.predefinedTextsBulleted;
		const predefinedTextsExpanded = this.textObject.predefinedTextsExpanded;
		const predefinedTextsRephrased = this.textObject.predefinedTextsRephrased;
		const predefinedTextsSimplified = this.textObject.predefinedTextsSimplified;
		const predefinedTextsSummarized = this.textObject.predefinedTextsSummarized;
		const output = this.getView().byId("output") as unknown as TextArea;

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
				this.translationKey = LanguageCode.BG;
				this.startTextGeneration(button, "reviseGenerating", predefinedTexts);
				break;
			case "English":
				this.translationKey = LanguageCode.EN;
				this.startTextGeneration(button, "reviseGenerating", predefinedTexts);
				break;
			case "German":
				this.translationKey = LanguageCode.DE;
				this.startTextGeneration(button, "reviseGenerating", predefinedTexts);
				break;
		}
	}

	sendTextHandler(event:any):void {
		const output = this.getView().byId("output") as unknown as TextArea;
		const toast = this.getView().byId("quickPromptToast") as unknown as Toast;

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
