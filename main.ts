import {
	Plugin, TFile,
} from "obsidian";
import {
	TOMATO_TIMER_VIEW_TYPE,
	TomatoTimerView,
	TypeCurrentTask,
} from "./pomodoro";
interface MyPluginSettings {
	mySetting: string;
} //TODO: 设置项

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};
type MODE_TYPE = "md" | "kanban" | "tasks" | 'dataview';
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		this.registerView(
			TOMATO_TIMER_VIEW_TYPE,
			(leaf) => new TomatoTimerView(leaf)
		);
		this.app.workspace.on("layout-change", () => {
			setTimeout(() => {
				this.addTimerButtonToKanban();
			}, 300);
		});
		this.registerMarkdownPostProcessor((el: HTMLElement, context) => {
			setTimeout(() => {
				// 还需要等其他插件渲染完毕
				this.addTimerButtonToTasks(el);
			}, 300);
		});
		this.registerDomEvent(document, "click", (event: MouseEvent) => {
			this.handleTomatoButton(event);
		}, true);
	}
	private handleTomatoButton(event: MouseEvent) {
		const target = event.target as HTMLElement;

		if (target.matches(".tomato-timer-button")) {
			event.preventDefault();
			event.stopPropagation();
			const type = target.getAttribute("data-type");
			let taskText = "";
			let file = this.app.workspace.getActiveFile();
			const taskListItem = target.closest(".task-list-item");
			// 获取taskText
			switch (type) {
				case "md":
					taskText = taskListItem!.textContent || '未获取';
					break;
				case "kanban":
					taskText = target.closest(".kanban-plugin__item-title-wrapper")!.textContent || '未获取';
					break;
				case "tasks":
					if (taskListItem) {
						taskText = taskListItem.querySelector('.task-description')!.textContent || '未获取';
						const pathElement = taskListItem.querySelector('.tasks-backlink a') as HTMLElement;
						const path = pathElement.innerText;
						file = this.getFileAdaptTasks(path);
					}
					break;
				case 'dataview':
					taskText = target?.closest(".task-list-item")?.textContent || '未获取';
					// eslint-disable-next-line no-case-declarations
					const domA = target?.closest(".result-group")?.previousElementSibling?.querySelector('a')
					// 获取data-href
					// eslint-disable-next-line no-case-declarations
					if (domA) {
						const dataPath = domA.getAttribute('data-href')
						if (dataPath) {
							file = this.app.vault.getAbstractFileByPath(dataPath) as TFile
						}
					}
					break
				default:
					break;
			}
			if (file) {
				// 去除duration及后面的字
				let cleanTaskText = taskText?.split("duration")[0];
				// 去除番茄图标
				cleanTaskText = cleanTaskText?.replace("🍅", "");

				// // 激活番茄时钟视图并传递任务文本
				this.openPomodoro(cleanTaskText || "", file);
			}else {
				console.log('未找到文件')
			}

		}
	}
	private getFileAdaptTasks(pathName: string) {
		const files = this.app.vault.getFiles();
		let file = null;
	
		if (pathName.includes('.md')) {
			file = this.findFileByPath(files, '/' + pathName);
		} else if (pathName.includes('>')) {
			const [fileName] = pathName.split('>');
			const cleanFileName = fileName.trim();
			file = this.findFileByBasename(files, cleanFileName);
		} else {
			file = this.findFileByBasename(files, pathName);
		}
	
		return file||null;
	}
	
	private findFileByPath(files: TFile[], path: string) {
		return files.find(file => file.path === path);
	}
	
	private findFileByBasename(files: TFile[], basename: string) {
		return files.find(file => file.basename === basename);
	}
	private openPomodoro(taskText: string, file: TFile) {
		const currentTask = {
			taskText: taskText,
			file,
		};
		// 激活番茄时钟视图
		this.activateView(currentTask);
	}
	private async activateView(currentTask?: TypeCurrentTask) {
		this.app.workspace.detachLeavesOfType(TOMATO_TIMER_VIEW_TYPE);

		await this.app.workspace.getRightLeaf(false).setViewState({
			type: TOMATO_TIMER_VIEW_TYPE,
			active: true,
			state: {
				currentTask,
			},
		});
		const leaf = this.app.workspace.getLeavesOfType(
			TOMATO_TIMER_VIEW_TYPE
		)[0];

		this.app.workspace.revealLeaf(leaf);
	}
	onunload() { }

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	createButton(type: MODE_TYPE): HTMLButtonElement {
		const button = document.createElement("button");
		button.innerText = "🍅";
		button.classList.add("tomato-timer-button");
		button.setAttribute("data-type", type);
		return button;
	}

	addTomato(taskItem: HTMLElement, type: MODE_TYPE) {
		if (taskItem.querySelector(".tomato-timer-button")) {
			return;
		}
		const button = this.createButton(type);
		taskItem.appendChild(button);
	}
	addTimerButtonToKanban() {
		const kanbanDom = document.querySelector(".kanban-plugin")
		if (kanbanDom) {
			const list = kanbanDom.querySelectorAll(
				".kanban-plugin__item-title-wrapper	"
			);
			list.forEach((taskItem) => {
				this.addTomato(taskItem as HTMLElement, 'kanban');
			})
		}
	}
	private addTimerButtonToTasks(el: HTMLElement): void {
		const ancestor = el.closest('.task-list-item');

		if (ancestor) {
			if (ancestor.querySelector('.task-extras')) {
			
				this.addTomato(ancestor as HTMLElement, 'tasks');
			} else if (ancestor.classList.contains('dataview')) {
				this.addTomato(ancestor as HTMLElement, 'dataview');
			} else {
				this.addTomato(ancestor as HTMLElement, 'md');
			}
		}
	}
}
