import {
	Plugin, TFile, PluginSettingTab, Setting
} from "obsidian";
import {
	TOMATO_TIMER_VIEW_TYPE,
	TomatoTimerView,
	TypeCurrentTask,
} from "./pomodoro";
import {
	PomodoroTaskPluginSettings,
	DEFAULT_SETTINGS,
	PomodoroSettingTab
} from "./settings";

export default class PomodoroTaskPlugin extends Plugin {
	settings: PomodoroTaskPluginSettings;

	async onload() {
		console.log('tamato-task出发了')
		await this.loadSettings();

		// 添加设置标签页
		this.addSettingTab(new PomodoroSettingTab(this.app, this));

		this.registerView(
			TOMATO_TIMER_VIEW_TYPE,
			(leaf) => new TomatoTimerView(leaf, this)
		);
	
		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				this.addTimerButtonToKanban();
			})
		);
		this.registerMarkdownPostProcessor((el: HTMLElement) => {
			this.addTimerButtonToTasks(el);
		});
		this.registerDomEvent(document, "click", (event: MouseEvent) => {
			this.handleTomatoButton(event);
		}, true);
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				this.addTimerButtonToKanban();
			})
		);

	
		
		// 添加DOM变化监听
		const observer = new MutationObserver(() => {
			this.addTimerButtonToKanban();
		});
		
		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				// 观察看板容器的变化
				const kanbanContainer = document.querySelector('.kanban-plugin__board ');
				if (kanbanContainer) {
					observer.observe(kanbanContainer, {
						childList: true,
						subtree: true
					});
				}
				this.addTimerButtonToKanban();
			})
		);
	}
	private handleTomatoButton(event: MouseEvent) {
		const target = event.target as HTMLElement;

		if (target.matches(".tomato-timer-button")) {
			event.preventDefault();
			event.stopPropagation();
			const type = target.getAttribute("data-type");
			let taskText = "";
			let file = null;
			file = this.app.workspace.getActiveFile()
			const taskListItem = target.closest(".task-list-item");
			let titleElement = null;
			// 获取taskText
			switch (type) {
				case "md":
					taskText = taskListItem?.querySelector('.tasks-list-text')?.textContent || '未获取';
					break;
				case "kanban":
					titleElement = target.closest(".kanban-plugin__item-title-wrapper")?.querySelector('.kanban-plugin__item-title');
					taskText = titleElement?.textContent || '未获取';
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
							file = this.app.vault.getAbstractFileByPath(dataPath)
						}
					}
					break
				default:
					break;
			}
			if (file instanceof TFile) {
				// // 激活番茄时钟视图并传递任务文本
				this.openPomodoro(taskText || "", file);
			}else {
				console.log('未找到文件')
			}

		}
	}
	private getFileAdaptTasks(pathName: string): TFile | null {
		if (!pathName?.trim()) {
			return null;
		}

		const cleanPath = pathName.trim();
		
		try {
			// 处理包含 .md 的完整路径
			if (cleanPath.endsWith('.md')) {
				// 直接使用 getAbstractFileByPath 而不是遍历所有文件
				const file = this.app.vault.getAbstractFileByPath(cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`);
				return file instanceof TFile ? file : null;
			}
			
			// 处理包含 '>' 的路径或直接文件名
			const fileName = cleanPath.includes('>') 
				? cleanPath.split('>')[0].trim() 
				: cleanPath;
				
			// 使用 getMarkdownFiles() 并结合 cache API
			return this.app.metadataCache.getFirstLinkpathDest(fileName, '');
		} catch (error) {
			console.error(`查找文件失败: ${error}`);
			return null;
		}
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
	
		// 检查是否已存在番茄钟视图
		const existingLeaf = this.app.workspace.getLeavesOfType(TOMATO_TIMER_VIEW_TYPE)[0];
		
		if (existingLeaf) {
			// 如果已存在视图，直接激活并更新状态
			await existingLeaf.setViewState({
				type: TOMATO_TIMER_VIEW_TYPE,
				active: true,
				state: {
					currentTask,
				},
			});
			this.app.workspace.revealLeaf(existingLeaf);
		} else {
			// 如果不存在视图，创建新的
			const leaf = this.app.workspace.getRightLeaf(false);
			await leaf.setViewState({
				type: TOMATO_TIMER_VIEW_TYPE,
				active: true,
				state: {
					currentTask,
				},
			});
			this.app.workspace.revealLeaf(leaf);
		}
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
	private addTimerButtonToTasks(el: HTMLElement): void {
		
		const taskItem = el.closest('.task-list-item');
		if (!taskItem || taskItem.querySelector('.tomato-timer-button')) {
			return;
		}

		let type: MODE_TYPE = 'md';
		if (taskItem.querySelector('.task-extras')) {
			type = 'tasks';
		} else if (taskItem.classList.contains('dataview')) {
			type = 'dataview';
		}

		this.addTomato(taskItem as HTMLElement, type);
	}
	private addTimerButtonToKanban() {
		const kanbanItems = document.querySelectorAll(
			".kanban-plugin__item-title-wrapper"
		);
		
		kanbanItems.forEach((item) => {
			if (!item.querySelector('.tomato-timer-button')) {
				this.addTomato(item as HTMLElement, 'kanban');
			}
		});
	}


}
