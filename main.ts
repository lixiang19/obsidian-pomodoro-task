import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { TOMATO_TIMER_VIEW_TYPE, TomatoTimerView ,TypeCurrentTask} from './pomodoro';
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		this.registerView(
			TOMATO_TIMER_VIEW_TYPE,
			(leaf) => new TomatoTimerView(leaf)
		);
		this.registerMarkdownPostProcessor((el: HTMLElement) => {
            this.addTimerButtonToTasks(el);
        });

		this.registerDomEvent(document, 'click', (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (target.matches('.tomato-timer-button')) {
				event.preventDefault();
				// 在这里添加打开番茄时钟弹窗的逻辑
				const target = event.target as HTMLElement;
				const taskText = target?.closest('.task-list-item').textContent;

				// 去除duration及后面的字
				let cleanTaskText = taskText?.split('duration')[0];
				// 去除番茄图标
				cleanTaskText = cleanTaskText?.replace('🍅', '')
			
				// // 激活番茄时钟视图并传递任务文本
				this.saveFileData(cleanTaskText || '');
			}
		});
	}
	private saveFileData(taskText:string) {
		const file = this.app.workspace.getActiveFile();
		if (file) {
			const currentTask = {
				taskText: taskText,
				file,
			};
			// 激活番茄时钟视图
			this.activateView(currentTask);
		}
	}
	private async activateView(currentTask?: TypeCurrentTask) {
		this.app.workspace.detachLeavesOfType(TOMATO_TIMER_VIEW_TYPE);

		await this.app.workspace.getRightLeaf(false).setViewState({
			type: TOMATO_TIMER_VIEW_TYPE,
			active: true,
			state: {
				currentTask
			},
		});
		const leaf = this.app.workspace.getLeavesOfType(TOMATO_TIMER_VIEW_TYPE)[0];

		this.app.workspace.revealLeaf(
			leaf
		);
	}
	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

    private addTimerButtonToTasks(el: HTMLElement): void {
        el.querySelectorAll('.task-list-item').forEach((taskItem) => {
            if (taskItem.querySelector('.tomato-timer-button')) {
                return;
            }
            const button = document.createElement('button');
            button.innerText = '🍅';
            button.classList.add('tomato-timer-button');
            taskItem.appendChild(button);
        });
    }
}
