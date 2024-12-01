import { ItemView, WorkspaceLeaf, ViewStateResult } from 'obsidian';
import * as React from "react";
import { Root, createRoot } from "react-dom/client";
import { TFile, Notice } from 'obsidian';
import Timer from './Timer';
import PomodoroTaskPlugin from './main';
import Break from './Break';

export const TOMATO_TIMER_VIEW_TYPE = 'tomato-timer-view';
export type TypeCurrentTask = {
	taskText: string;
	file: TFile;
	taskId?: string;
}
export class TomatoTimerView extends ItemView {
	root: Root | null = null;
	currentTask: TypeCurrentTask;
	plugin: PomodoroTaskPlugin;
	isBreakTime = false;
	autoStart = false
	private audioBuffers: { [key: string]: AudioBuffer } = {};
	private audioContext: AudioContext | null = null;
	private stateChangeCallbacks: (() => void)[] = [];

	constructor(leaf: WorkspaceLeaf, plugin: PomodoroTaskPlugin) {
		super(leaf);
		this.plugin = plugin;

		// 初始化 AudioContext
		this.audioContext = new AudioContext();
		// 预加载音频文件
		this.preloadAudioFiles();
	}

	// 预加载音频文件
	private async preloadAudioFiles() {
		try {
			for (const type of ['work', 'rest']) {
				const arrayBuffer = await this.plugin.app.vault.adapter.readBinary(
					`${this.plugin.manifest.dir}/media/${type}.mp3`
				);
				const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
				this.audioBuffers[type] = audioBuffer;
			}
		} catch (error) {
			console.error('预加载音频失败:', error);
		}
	}

	// 添加生成唯一ID的方法
	private generateTaskId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	}

	// 添加标记任务的方法
	private async markTaskWithId(file: TFile, taskText: string): Promise<string> {
		const taskId = this.generateTaskId();
		const fileContents = await this.app.vault.read(file);
		const fileLines = fileContents.split(/\r?\n/);

		// 优化任务匹配逻辑
		const lineNumber = fileLines.findIndex(line => {

			// 对于markdown任务，确保是任务格式
			if (line.startsWith('- [ ]') || line.startsWith('- [x]')) { // 这个也可能是完成的任务
				const taskContent = line.substring(5).trim();

				return taskContent === taskText.trim();
			}

			return line === taskText.trim();
		});

		if (lineNumber === -1) {
			throw new Error('无法找到任务行');
		}

		// 添加任务ID标记
		fileLines[lineNumber] = fileLines[lineNumber] + ` [tid::${taskId}]`;
		// await this.app.vault.modify(file, fileLines.join('\n'));

		// return taskId;
	}

	// 添加状态变化监听
	addStateChangeListener(callback: () => void) {
		this.stateChangeCallbacks.push(callback);
	}

	override async setState(
		state: {
			taskText: string;
			currentTask: TypeCurrentTask
		},
		result: ViewStateResult
	): Promise<void> {
		await super.setState(state, result);
		this.currentTask = state.currentTask;

		// 触发所有状态变化监听器
		this.stateChangeCallbacks.forEach(callback => callback());
	}

	override getState() {
		return {

			currentTask: this.currentTask
		};
	}
	// 返回视图类型
	getViewType(): string {
		return TOMATO_TIMER_VIEW_TYPE;
	}

	// 返回视图显示的名称（用户可见）
	getDisplayText(): string {
		return '番茄时钟';
	}

	// 播放音频的新方法
	async playSound(type: 'work' | 'rest') {
		try {
			if (!this.audioContext || !this.audioBuffers[type]) {
				return;
			}

			const source = this.audioContext.createBufferSource();
			source.buffer = this.audioBuffers[type];
			source.connect(this.audioContext.destination);
			source.start(0);
		} catch (error) {
			console.error(`播放${type}音频失败:`, error);
		}
	}

	// 修改 handleStop 方法
	handleStop(actualTimeElapsed: number) {
		this.onTomatoTimerEnd(actualTimeElapsed);
		this.playSound('work');  // 替换原来的 workEndSound.play()
		this.isBreakTime = true;
		this.rerender();
	}

	// 修改 handleBreakComplete 方法
	handleBreakComplete = (skipBreak?: boolean) => {
		if (!skipBreak) {  // 只有在正常结束时才播放音频
			this.playSound('rest');
		}
		this.autoStart = false
		this.isBreakTime = false;
		this.rerender();
	}

	rerender() {
		if (this.root) {
			console.log(this.getState().currentTask, 'currentTask')
			const taskText = this.getState().currentTask?.taskText;
			// 去除番茄图标，去除duration标记
			const cleanText = taskText?.replace("🍅", "").replace(/\[duration::[^\]]+\]/g, '').trim();
			this.root.render(
				this.isBreakTime ? (
					<Break
						duration={this.plugin.settings.breakDuration}
						onBreakComplete={this.handleBreakComplete}
					/>
				) : (
					<Timer
						taskText={cleanText}
						duration={this.plugin.settings.duration}
						onStop={(actualTimeElapsed) => this.handleStop(actualTimeElapsed)}
						autoStart={this.autoStart}
					/>
				)
			);
		}
	}

	async onTomatoTimerEnd(actualTimeElapsed: number) {
		if (!this.getState().currentTask) {
			new Notice('没有任务信息可用。');
			return;
		}
		const taskInfo = this.getState().currentTask;

		const fileContents = await this.app.vault.read(taskInfo.file);
		const fileLines = fileContents.split(/\r?\n/);

		// 通过任务ID查找任务行
		const lineNumber = fileLines.findIndex(line =>
			taskInfo.taskId ? line.includes(`[tid::${taskInfo.taskId}]`) : line.includes(taskInfo.taskText)
		);

		if (lineNumber === -1) {
			new Notice('无法找到任务行');
			return;
		}

		// 更新任务行
		if (this.plugin.settings.recordDuration) {
			if (fileLines[lineNumber].includes('[duration::')) {
				const durationString = fileLines[lineNumber].match(/\[duration:: (\d+)\]/);
				if (durationString) {
					const duration = parseInt(durationString[1]);
					fileLines[lineNumber] = fileLines[lineNumber].replace(
						/\[duration:: (\d+)\]/,
						`[duration:: ${duration + actualTimeElapsed}]`
					);
				}
			} else {
				fileLines[lineNumber] += ` [duration:: ${actualTimeElapsed}]`;
			}
		}

		// 添加番茄标记并移除任务ID标记
		fileLines[lineNumber] = fileLines[lineNumber].replace(/\s?\[tid::[^\]]+\]/, '') + ` 🍅`;

		await this.app.vault.modify(taskInfo.file, fileLines.join('\n'));
		new Notice('任务已完成');

		await this.updateCalendarTomato(actualTimeElapsed);
	}

	private async updateCalendarTomato(duration: number) {
		if (!this.plugin.settings.autoUpdateCalendarTomato) return;

		const today = new Date().toISOString().split('T')[0];
		const filePath = `${this.plugin.settings.calendarFolderPath}/${today}.md`;

		const calendarFile = this.app.vault.getAbstractFileByPath(filePath);

		if (!(calendarFile instanceof TFile)) {
			console.log(`未找到日历文件: ${filePath}`);
			return;
		}

		const fileCache = this.app.metadataCache.getFileCache(calendarFile);
		const frontmatter = fileCache?.frontmatter || {};
		const currentTomatoes = frontmatter.番茄数 || 0;
		const tomatoRecord = frontmatter.番茄记录 || '';

		await this.app.fileManager.processFrontMatter(calendarFile, (frontmatter) => {
			frontmatter["番茄数"] = currentTomatoes + 1;
			frontmatter["番茄记录"] = tomatoRecord + "🍅";
			// 如果设置了记录时长，则更新番茄时长
			if (this.plugin.settings.recordDuration) {
				frontmatter["番茄时长"] = (frontmatter["番茄时长"] || 0) + duration;
			}
		});
	}

	// 在这里设置视图的初始内容
	async onOpen() {
		const container = this.containerEl.children[1];
		if (!container) {
			throw new Error('容器元素未找到');
		}

		this.root = createRoot(container);
		this.rerender();

		// 添加状态变化监听
		this.addStateChangeListener(() => {
			if (this.getState().currentTask) {
				this.rerender();
			}
		});
	}

	// 清理资源
	async onClose() {
		this.audioContext?.close();
		this.root?.unmount();
	}

	// 添加 getIcon 方法
	getIcon(): string {
		return "alarm-clock-plus"; // 或者使用其他 Lucide 图标名称
	}
}

