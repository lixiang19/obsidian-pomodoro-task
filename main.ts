import {
	Plugin, TFile, PluginSettingTab, Setting,
	setIcon
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

type MODE_TYPE = 'md' | 'tasks' | 'kanban' | 'dataview';

export default class PomodoroTaskPlugin extends Plugin {
	settings: PomodoroTaskPluginSettings;
	kanbanObserver: MutationObserver | null;

	async onload() {
	
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
				this.setupKanbanObserver();
			})
		);
		this.registerMarkdownPostProcessor((el: HTMLElement) => {
			this.addTimerButtonToTasks(el);
		});
		// 
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
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
			// 如果是完整路径（包含.md），直接使用 getAbstractFileByPath
			if (cleanPath.endsWith('.md')) {
				const file = this.app.vault.getAbstractFileByPath(
					cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
				);
				return file instanceof TFile ? file : null;
			}
			
			// 处理简单文件名或带有 '>' 的路径
			const fileName = cleanPath.includes('>') 
				? cleanPath.split('>')[0].trim() 
				: cleanPath;
				
			// 使用 getLinkpath 来解析文件链接
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
		const workspace = this.app.workspace;
		const leaf = workspace.getLeavesOfType(TOMATO_TIMER_VIEW_TYPE)[0] 
			|| workspace.getRightLeaf(false);
			
		await leaf.setViewState({
			type: TOMATO_TIMER_VIEW_TYPE,
			active: true,
			state: { currentTask }
		});
		
		workspace.revealLeaf(leaf);
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
	createButton(type: MODE_TYPE): HTMLElement {
		const button = document.createElement("div");
		button.classList.add("tomato-timer-button", "clickable-icon");
		button.setAttribute("data-type", type);
		
		// 创建图标容器
		const iconContainer = document.createElement("div");
		iconContainer.classList.add("timer-icon");
	
		setIcon(iconContainer, "alarm-clock-plus");
		
		// 直接在按钮创建时绑定点击事件
		button.addEventListener("click", (event: MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();
			this.handleTomatoButton(event);
		});
		
		button.appendChild(iconContainer);
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
		const board = document.querySelector('.kanban-plugin__board');
		if (!board) return;
		
		const items = board.querySelectorAll('.kanban-plugin__item-title-wrapper:not(:has(.tomato-timer-button))');
		items.forEach(item => this.addTomato(item as HTMLElement, 'kanban'));
	}
	private setupKanbanObserver() {
		if (this.kanbanObserver) {
			this.kanbanObserver.disconnect();
		}
		
		const kanbanContainer = document.querySelector('.kanban-plugin__board');
		if (kanbanContainer) {
			if (!this.kanbanObserver) {
				this.kanbanObserver = new MutationObserver(() => {
					this.addTimerButtonToKanban();
				});
			}
			this.kanbanObserver.observe(kanbanContainer, {
				childList: true,
				subtree: true
			});
		}
	}


}
