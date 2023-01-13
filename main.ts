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

		this.addCommand({
			id: 'obs-tab-tab-key',
			name: 'Tab key trigger',
			hotkeys: [
				{
					key: "Tab",
					modifiers: []
				}
			],
			editorCallback: (editor) => {
				console.log("TAB");
				let cursorPos = editor.getCursor();
				let cursorFrom = editor.getCursor("from");
				let selection = editor.getSelection();
				if (selection != '' && !this.settings.indentsIfSelection) {
					editor.replaceSelection('\t');
					cursorPos = cursorFrom;
				}
				cursorPos.ch++;
				cursorFrom.ch++;
				if (selection == '' || !this.settings.indentsIfSelection) {
					editor.setLine(cursorPos.line, editor.getLine(cursorPos.line).substring(0, cursorPos.ch - 1) + (selection == '' ? '\t' : '') + editor.getLine(cursorPos.line).substring(cursorPos.ch - 1));
				}
				else if (selection != '') {
					for (let i = Math.min(cursorFrom.line, cursorPos.line); i <= Math.max(cursorFrom.line, cursorPos.line); i++)
						editor.setLine(i, '\t' + editor.getLine(i));
					editor.setSelection(cursorFrom, cursorPos);
				}
				if (!this.settings.indentsIfSelection && selection != '')
					cursorPos.ch--;
				if (selection == '' || !this.settings.indentsIfSelection)
					editor.setCursor(cursorPos);
			},
		});
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
