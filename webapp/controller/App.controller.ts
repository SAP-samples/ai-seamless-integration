import BaseController from "ai/integration/controller/BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import { ViewModelData } from "../model/types";

// UI5 Web Components
import type Dialog from "@ui5/webcomponents/dist/Dialog";
import {ValueState} from "sap/ui/core/library";
import type Toast from "@ui5/webcomponents/dist/Toast";
import type Menu from "@ui5/webcomponents/dist/Menu";
import type Control from "sap/ui/core/Control";
import distributionLists from "../model/distributionLists";

import Event from "sap/ui/base/Event";

interface VersionEntry {
	value: string;
	endAction: string;
}

/**
 * @namespace ai.integration.controller
 */
export default class App extends BaseController {
	viewModel: JSONModel;
	viewModelData: ViewModelData;
	generationId: number;
	generationStopped: boolean = false;
	versionHistory: VersionEntry[] = [];
	currentVersionIndex: number = -1;
	initialValueApplied: boolean = false;

	// Context forwarded to the (mocked) generation service.
	contentId: string = "EMAIL-001";
	personalNoteId: string = "NOTE-001";
	language: string = "en";

	/**
	 * Called when the controller is instantiated.
	 */
	onInit() {
		this.applyContentDensity();
		this.initViewModel();
	}

	/**
	 * Applies the initial editor content after the view renders.
	 *
	 * The RichTextEditorWA OpenUI5 wrapper does not expose the inherited `value`
	 * property, so `value="{...}"` data binding has no effect. The initial content
	 * from the model is therefore applied imperatively (once the editor is ready).
	 */
	onAfterRendering(): void {
		this.applyInitialEditorValue(0);
	}

	applyInitialEditorValue(attempt: number): void {
		if (this.initialValueApplied) {
			return;
		}

		const dom = this.getEditorDom();
		// Wait until the editor (and its toolbar) has rendered.
		if (!dom || !dom.shadowRoot?.querySelector("sap-ai-writing-assistant")) {
			if (attempt < 80) {
				setTimeout(() => this.applyInitialEditorValue(attempt + 1), 250);
			}
			return;
		}

		this.initialValueApplied = true;
		this.pushEditorValue();
	}

	/**
	 * Initializes the view model with the initial state of the app.
	 */
	initViewModel(): void {
		const initialModelData = {
			outputValue: `<p>I <em>want</em> a 1000-character <u>personal note</u> that invites the recipient to <strong>visit us &amp;</strong> <a href=https://www.sap.com/index.html>https://www.sap.com/index.html</a> @ o&rsquo;cl&ocirc;ck</p>`,
			outputLoading: false,
			outputCurrentVersion: 0,
			outputTotalVersions: 0,
			outputPromptDescription: "",
			outputValueState: ValueState.None,
			buttonState: "generate",
			outputBusy: false,
			outputEnabled: true,
			sendButtonEnabled: true,
			subject: "",
			recipients: []
		} as ViewModelData;

		const model = new JSONModel(initialModelData);
		this.getView().setModel(model, "appView");

		this.viewModel = model;
		this.viewModelData = this.viewModel.getData() as ViewModelData;
	}

	/**
	 * Applies the content density mode to the view.
	 */
	applyContentDensity(): void {
		this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
	}

	onDialogCancelButton(): void {
		const acknowledgementDialog = this.getView().byId("acknowledgementDialog") as unknown as Dialog;
		acknowledgementDialog.setOpen(false);
	}

	/**
	 * Handles clicks on the AI input's action menu. The "Generate" action reads
	 * the group name entered in the input, finds the first distribution list
	 * whose name contains it (case-insensitive), and creates one recipient token
	 * per member, using the raw e-mail address as the token text.
	 */
	onAiInputActionClick(event: Event<{ text: string }>): void {
		if (event.getParameter("text") !== "Generate") {
			return;
		}

		const input = this.byId("dlGroupInput") as unknown as Control & { getValue(): string; setValue(value: string): void };
		const query = (input.getValue() || "").trim();
		if (!query) {
			return;
		}

		const normalized = query.toLowerCase();
		const group = distributionLists.find(dl => dl.group.toLowerCase().includes(normalized));
		if (!group) {
			return;
		}

		const existing = this.viewModelData.recipients.map(recipient => recipient.text);
		group.members.forEach(email => {
			if (!existing.includes(email)) {
				this.viewModelData.recipients.push({ text: email });
				existing.push(email);
			}
		});

		this.viewModel.updateBindings(true);
		input.setValue("");
	}

	/**
	 * Drives the subject-generation button:
	 * - "generate": creates a first subject and switches the button into its
	 *   "revise" state, which exposes the Regenerate / Spellcheck dropdown.
	 * - "revise": opens that dropdown (handled by onSubjectMenuItemClick).
	 *
	 * Everything here targets the "subject" input only - it never updates the
	 * output text area or its model data.
	 */
	aiQuickPromptButtonClickHandler(): void {
		const subject = this.viewModelData.subject;
		switch (this.viewModelData.buttonState) {
			case "":
			case "generate": {
				this.viewModelData.subject = this.getRandomSubject(subject);
				this.viewModelData.buttonState = "revise";
				this.viewModel.updateBindings(true);
				break;
			}
			case "revise": {
				const menu = this.byId("subjectMenu") as unknown as Menu;
				const button = this.byId("quickPromptButton") as unknown as Control;
				menu.setOpener(button.getId());
				menu.setOpen(true);
				break;
			}
		}
	}

	/**
	 * Handles the subject button's Regenerate / Spellcheck menu. Both actions
	 * operate only on the "subject" input.
	 */
	onSubjectMenuItemClick(event: Event<{ text: string }>): void {
		const subject = this.viewModelData.subject;
		switch (event.getParameter("text")) {
			case "Regenerate":
				this.viewModelData.subject = this.getRandomSubject(subject);
				break;
			case "Spellcheck":
				this.viewModelData.subject = this.spellcheckSubject(subject);
				break;
		}
		this.viewModel.updateBindings(true);
	}

	/** Mock spellcheck: normalizes whitespace and capitalization of the subject. */
	spellcheckSubject(text: string): string {
		const normalized = text.replace(/\s+/g, " ").trim();
		return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : normalized;
	}

	/**
	 * Returns a random short subject line (mock). When a current value is passed,
	 * a different line is returned so "regenerate" always changes the subject.
	 *
	 * Replace the mock subjects with an actual service/API call.
	 */
	getRandomSubject(current?: string): string {
		const subjects = [
			"Invitation: Grand Opening of Our Riverside Branch",
			"You're invited - celebrate with us",
			"A personal invitation from Northbridge Bank",
			"Save the date: Riverside Branch launch",
			"Join us for an exclusive evening",
		];
		const pool = current ? subjects.filter(subject => subject !== current) : subjects;
		const choices = pool.length ? pool : subjects;
		return choices[Math.floor(Math.random() * choices.length)];
	}

	// --- Mocked AI services --------------------------------------------------

	/**
	 * Mock of the backend service
	 * `generate_personal_note_with_ai(content_id, user_input_html, language, personal_note_id)`,
	 * which returns the `personal_note_html` to be set in the editor.
	 *
	 * Replace the hardcoded return value with an actual service/API call.
	 */
	generatePersonalNoteWithAi(_contentId: string, _userInputHtml: string, _language: string, _personalNoteId: string): string {
		return "<p>On behalf of Northbridge Bank, I am pleased to extend a personal invitation to join us for the grand opening of our new Riverside Branch on Thursday, 22 October 2026, at 5:30 o’clock in the evening. This milestone marks the beginning of an important chapter for our clients, colleagues, and community, and we would be honored to have you with us.</p>";
	}

	/** Mock of a "regenerate" AI service. Replace with an actual service/API call. */
	regeneratePersonalNoteWithAi(_userInputHtml: string): string {
		return "<p>On behalf of Northbridge Bank, it is my genuine pleasure to personally invite you to the grand opening of our new Riverside Branch on Thursday, 22 October 2026, at 5:30 in the evening. This milestone opens an important new chapter for our clients, colleagues, and community, and your presence would make the occasion all the more meaningful.</p>";
	}

	/** Mock of a "spellcheck" AI service. Replace with an actual service/API call. */
	spellcheckPersonalNoteWithAi(_userInputHtml: string): string {
		return "<p>On behalf of Northbridge Bank, I am pleased to extend a personal invitation to join us for the grand opening of our new Riverside Branch on Thursday, 22 October 2026, at 5:30 o’clock in the evening. This milestone marks the beginning of an important chapter for our clients, colleagues, and community, and we would be honoured to have you with us.</p>";
	}

	/**
	 * Handles clicks on the AI menu (Generate / Regenerate / Spellcheck).
	 */
	onAiMenuItemClick(event: Event<{ text: string }>): void {
		switch (event.getParameter("text")) {
			case "Generate":
				this.runAiAction("Generating personal note...", "Generated personal note", () =>
					this.generatePersonalNoteWithAi(this.contentId, this.getUserInputHtml(), this.language, this.personalNoteId));
				break;
			case "Regenerate":
				this.runAiAction("Regenerating personal note...", "Regenerate personal note", () =>
					this.regeneratePersonalNoteWithAi(this.getUserInputHtml()));
				break;
			case "Spellcheck":
				this.runAiAction("Checking spelling and grammar...", "Spellchecked personal note", () =>
					this.spellcheckPersonalNoteWithAi(this.getUserInputHtml()));
				break;
		}
	}

	/**
	 * Reads the current editor content, used as `user_input_html` for the AI services.
	 */
	getUserInputHtml(): string {
		this.pullEditorValue();
		return this.viewModelData.outputValue;
	}

	/**
	 * Runs an AI action: shows the editor's loading state, simulates an asynchronous
	 * service call and then applies the returned HTML as a new version.
	 */
	runAiAction(processingLabel: string, completedLabel: string, producer: () => string): void {
		this.saveCurrentVersion();
		this.generationStopped = false;
		clearTimeout(this.generationId);

		this.viewModelData.outputLoading = true;
		this.viewModelData.outputPromptDescription = processingLabel;
		this.viewModelData.sendButtonEnabled = false;
		this.viewModel.updateBindings(true);

		// Simulate the latency of an external AI service call.
		this.generationId = setTimeout(() => {
			if (this.generationStopped) {
				return;
			}
			this.viewModelData.outputValue = producer();
			this.pushEditorValue();
			this.viewModelData.outputLoading = false;
			this.viewModelData.sendButtonEnabled = true;
			this.recordVersion(completedLabel);
		}, 1500);
	}

	/**
	 * Pushes the current editor content as a new version and refreshes the
	 * editor's native versioning state.
	 */
	recordVersion(endAction: string): void {
		this.versionHistory.push({ value: this.viewModelData.outputValue, endAction });
		this.currentVersionIndex = this.versionHistory.length - 1;
		this.updateVersioningState();
	}

	/**
	 * Syncs the editor's native versioning state (current/total version and the
	 * prompt description) with the current entry in the version history.
	 */
	updateVersioningState(): void {
		const entry = this.versionHistory[this.currentVersionIndex];
		this.viewModelData.outputCurrentVersion = this.currentVersionIndex + 1;
		this.viewModelData.outputTotalVersions = this.versionHistory.length;
		this.viewModelData.outputPromptDescription = entry ? entry.endAction : "";
		this.viewModel.updateBindings(true);
	}

	/**
	 * Persists any manual edits in the editor back into the current version entry
	 * so they are not lost when navigating between versions or starting a new run.
	 */
	saveCurrentVersion(): void {
		this.pullEditorValue();
		if (this.versionHistory.length > 0 && this.versionHistory[this.currentVersionIndex]) {
			this.versionHistory[this.currentVersionIndex].value = this.viewModelData.outputValue;
		}
	}

	/**
	 * Handles the editor's native version navigation (left/right buttons).
	 */
	onVersionChange(event: Event<{ backwards: boolean }>): void {
		const backwards = event.getParameter("backwards");

		if (backwards && this.currentVersionIndex > 0) {
			this.saveCurrentVersion();
			this.currentVersionIndex--;
		} else if (!backwards && this.currentVersionIndex < this.versionHistory.length - 1) {
			this.saveCurrentVersion();
			this.currentVersionIndex++;
		} else {
			return;
		}

		this.viewModelData.outputValue = this.versionHistory[this.currentVersionIndex].value;
		this.updateVersioningState();
		this.pushEditorValue();
	}

	/**
	 * Handles the editor's native stop button, cancelling an in-progress AI action.
	 */
	onStopGeneration(): void {
		if (!this.viewModelData.outputLoading) {
			return;
		}

		this.generationStopped = true;
		clearTimeout(this.generationId);
		this.viewModelData.outputLoading = false;
		this.viewModelData.sendButtonEnabled = true;
		this.viewModel.updateBindings(true);
	}

	/**
	 * Returns the native editor DOM element. The RichTextEditorWA OpenUI5 wrapper does
	 * not expose the inherited `value` property, so content is managed via the DOM.
	 */
	getEditorDom(): (HTMLElement & { value: string }) | null {
		const editor = this.byId("output") as unknown as Control;
		return editor ? (editor.getDomRef() as (HTMLElement & { value: string }) | null) : null;
	}

	/** Pushes the model's output value into the editor. */
	pushEditorValue(): void {
		const dom = this.getEditorDom();
		if (dom) {
			dom.value = this.viewModelData.outputValue ?? "";
		}
	}

	/** Reads the current editor content back into the model. */
	pullEditorValue(): void {
		const dom = this.getEditorDom();
		if (dom) {
			this.viewModelData.outputValue = dom.value ?? "";
		}
	}

	/**
	 * Resets the output and its version history to the initial empty state.
	 */
	resetOutput(): void {
		this.versionHistory = [];
		this.currentVersionIndex = -1;

		this.viewModelData.outputValue = "";
		this.viewModelData.outputCurrentVersion = 0;
		this.viewModelData.outputTotalVersions = 0;
		this.viewModelData.outputPromptDescription = "";
		this.viewModelData.subject = "";
		this.viewModel.updateBindings(true);
		this.pushEditorValue();
	}

	onCancelClick(): void {
		this.resetOutput();
		// Clear the recipient tokens and reset the subject button to its initial
		// "Generate" state.
		this.viewModelData.recipients = [];
		this.viewModelData.buttonState = "generate";
		this.viewModel.updateBindings(true);
	}

	sendTextHandler(): void {
		const toast = this.getView().byId("quickPromptToast") as unknown as Toast;

		this.pullEditorValue();
		if (this.viewModelData.outputValue) {
			toast.setOpen(true);
			this.resetOutput();
		}
	}
}
