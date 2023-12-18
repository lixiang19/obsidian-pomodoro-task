import { ItemView, WorkspaceLeaf, ViewStateResult } from 'obsidian';
import * as React from "react";
import { Root, createRoot } from "react-dom/client";
import { TFile, Notice } from 'obsidian';
import Timer from './Timer';
export const TOMATO_TIMER_VIEW_TYPE = 'tomato-timer-view';
export type TypeCurrentTask = {
	taskText: string;
	file: TFile;
}
export class TomatoTimerView extends ItemView {
	root: Root | null = null;
	currentTask: TypeCurrentTask
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	override async setState(
		state: {
			taskText: string;
			currentTask: TypeCurrentTask
		},
		result: ViewStateResult
	): Promise<void> {


		this.currentTask = state.currentTask
		return super.setState(state, result);
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
	handleStop(actualTimeElapsed: number) {

		this.onTomatoTimerEnd(actualTimeElapsed)
	}
	async onTomatoTimerEnd(actualTimeElapsed: number) {
		if (!this.getState().currentTask) {
			new Notice('没有任务信息可用。');
			return;
		}
		const taskInfo = this.getState().currentTask;

		const fileContents = await this.app.vault.read(taskInfo.file);
		const fileLines = fileContents.split(/\r?\n/);

		const lineNumber = fileLines.findIndex((line) => line.includes(taskInfo.taskText));
		if (lineNumber != -1) {
			// 如果原来已经有[duration:: 25]，需要在这个基础上加上25
			if (fileLines[lineNumber].includes('[duration::')) {
				const duration = parseInt(fileLines[lineNumber].match(/\[duration:: (\d+)\]/)[1]);
				fileLines[lineNumber] = fileLines[lineNumber].replace(/\[duration:: (\d+)\]/, `[duration:: ${duration + actualTimeElapsed}]`);
			} else {
				fileLines[lineNumber] += `[duration:: ${actualTimeElapsed}]`;
			}
		} else {
			new Notice('无法找到任务行。');
			return;
		}

		// 将修改后的内容写回文件
		await this.app.vault.modify(taskInfo.file, fileLines.join('\n'));
		new Notice('任务时长已添加。');
	}
	// 在这里设置视图的初始内容
	async onOpen() {

		setTimeout(() => {
			const taskText = this.getState().currentTask.taskText;
			this.root = createRoot(this.containerEl.children[1]);
			this.root.render(<Timer taskText={taskText} onStop={(actualTimeElapsed) => this.handleStop(actualTimeElapsed)} />);
		}, 100);
		// 没搞明白viewState怎么传递的，也没搞明白onOpen的时机，只能先写个setTimeout了
	}

	// 清理/移除视图时的处理
	async onClose() {
		this.root?.unmount();
	}
}

