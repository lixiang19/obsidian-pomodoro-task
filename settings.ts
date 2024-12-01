import { App, PluginSettingTab, Setting } from "obsidian";
import PomodoroTaskPlugin from "./main";

export interface PomodoroTaskPluginSettings {
    duration: number;
    breakDuration: number;
    recordDuration: boolean;
    autoUpdateCalendarTomato: boolean;
    calendarFolderPath: string;
}

export const DEFAULT_SETTINGS: PomodoroTaskPluginSettings = {
    duration: 25,
    breakDuration: 5,
    recordDuration: false,
    autoUpdateCalendarTomato: false,
    calendarFolderPath: 'Calendar',
};

export class PomodoroSettingTab extends PluginSettingTab {
    plugin: PomodoroTaskPlugin;

    constructor(app: App, plugin: PomodoroTaskPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: '番茄时钟设置' });

        new Setting(containerEl)
            .setName('番茄时长')
            .setDesc('每个番茄钟的时长（分钟）')
            .addText(text => text
                .setPlaceholder('25')
                .setValue(this.plugin.settings.duration.toString())
                .onChange(async (value) => {
                    const duration = parseInt(value);
                    if (!isNaN(duration) && duration > 0) {
                        this.plugin.settings.duration = duration;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('休息时长')
            .setDesc('每个休息时间的时长（分钟）')
            .addText(text => text
                .setPlaceholder('5')
                .setValue(this.plugin.settings.breakDuration.toString())
                .onChange(async (value) => {
                    const breakDuration = parseInt(value);
                    if (!isNaN(breakDuration) && breakDuration > 0) {
                        this.plugin.settings.breakDuration = breakDuration;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('记录番茄时长')
            .setDesc('是否在任务中记录实际完成时长')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.recordDuration)
                .onChange(async (value) => {
                    this.plugin.settings.recordDuration = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("自动更新日历番茄数")
            .setDesc("完成一个番茄时是否自动更新日历属性中的番茄数")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.autoUpdateCalendarTomato)
                    .onChange(async (value) => {
                        this.plugin.settings.autoUpdateCalendarTomato = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("日历文件夹路径")
            .setDesc("存放日历笔记的文件夹路径")
            .addText(text => text
                .setPlaceholder('Calendar')
                .setValue(this.plugin.settings.calendarFolderPath)
                .onChange(async (value) => {
                    const normalizedPath = value.replace(/^\/+|\/+$/g, '');
                    this.plugin.settings.calendarFolderPath = normalizedPath;
                    await this.plugin.saveSettings();
                }));
    }
} 
