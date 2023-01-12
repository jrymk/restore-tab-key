import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface TabKeyPluginSettings {
	indentsIfSelection: boolean
}

const DEFAULT_SETTINGS: TabKeyPluginSettings = {
	indentsIfSelection: true
}

export default class TabKeyPlugin extends Plugin {
	settings: TabKeyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SettingTab(this.app, this));

		this.registerDomEvent(document, 'keydown', (e: KeyboardEvent) => {
			let view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view)
				return;
			let editor = view.editor;

			if (e.code != 'Tab' || e.shiftKey)
				return;

			let cursorPos = editor.getCursor();
			let cursorFrom = editor.getCursor("from");
			let selection = editor.getSelection();
			if (selection != '' && !this.settings.indentsIfSelection) {
				editor.replaceSelection('\t');
				cursorPos = cursorFrom;
			}
			if (selection == '' || !this.settings.indentsIfSelection)
				editor.setLine(cursorPos.line, editor.getLine(cursorPos.line).substring(1, cursorPos.ch) + (selection == '' ? '\t' : '') + editor.getLine(cursorPos.line).substring(cursorPos.ch));
			if (selection == '' || !this.settings.indentsIfSelection)
				editor.setCursor(cursorPos);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SettingTab extends PluginSettingTab {
	plugin: TabKeyPlugin;

	constructor(app: App, plugin: TabKeyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Obsidian Tab Key Plugin' });
		containerEl.createEl('i', { text: 'Restore tab key behaviour: tab key inserts a tab, the way it should be.' });
		containerEl.createEl('br');

		new Setting(containerEl)
			.setName('Indents when selection is not empty')
			.setDesc('true(default): Select some text and press tab key will indent the selected lines. Same behaviour as most IDEs. \nfalse: Selection will be replaced with one tab')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.indentsIfSelection)
				.onChange(async (value) => {
					this.plugin.settings.indentsIfSelection = value;
					await this.plugin.saveSettings();
				}));
	}
}
