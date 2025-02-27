import { BrowserWindow, app, ipcMain, protocol, session } from 'electron';
import {
	CLIENT_AUTHOR,
	CLIENT_LICENSE_PERMALINK,
	CLIENT_NAME,
	ELECTRON_FLAGS,
	GAME_CONSTRUCTOR_OPTIONS,
	IS_DEVELOPMENT,
	MESSAGE_EXIT_CLIENT,
	SPLASH_CONSTRUCTOR_OPTIONS,
	TARGET_GAME_URL,
	WINDOW_ALL_CLOSED_BUFFER_TIME
} from '@constants';
import { ElectronBlocker } from '@cliqz/adblocker-electron';
import SplashUtils from '@splash-utils';
import WindowUtils from '@window-utils';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import { info } from '@logger';
import { join } from 'path';

// eslint-disable-next-line no-console
console.log(`${ CLIENT_NAME }  Copyright (C) 2022  ${ CLIENT_AUTHOR }
This program comes with ABSOLUTELY NO WARRANTY.
This is free software, and you are welcome to redistribute it under certain
conditions; read ${ CLIENT_LICENSE_PERMALINK } for more details.\n`);

class Application {

	/** Run the things possible before the app reaches the ready state. */
	public static preAppReady(): void {
		Application.registerAppEventListeners();
		Application.registerIpcEventListeners();
		Application.setAppFlags();
	}

	/**
	 * Initialize the app, register protocols.  
	 * Create the splash window, followed by the game window.
	 */
	public static async init(): Promise<void> {
		Application.setAppName();
		Application.registerFileProtocols();

		await Promise.all([
			WindowUtils.createWindow(SPLASH_CONSTRUCTOR_OPTIONS).then(window => SplashUtils.load(window)),
			Application.enableTrackerBlocking()
		]);
		WindowUtils.createWindow(GAME_CONSTRUCTOR_OPTIONS, TARGET_GAME_URL);
	}

	/** Register the listeners for the app process (e.g. 'window-all-closed') */
	private static registerAppEventListeners(): void {
		info('Registering app event listeners');

		app.on('quit', () => app.quit());
		app.on('window-all-closed', () => {
			if (process.platform !== 'darwin') {
				// Allow some buffer time where one window may close so another one can open.
				return setTimeout(() => {
					const windowCount = BrowserWindow.getAllWindows().length;
					if (windowCount === 0) app.quit();
				}, WINDOW_ALL_CLOSED_BUFFER_TIME);
			}

			return null;
		});
		app.on('web-contents-created', (_evt, webContents) => {
			webContents.on('select-bluetooth-device', (evt, _devices, callback) => {
				evt.preventDefault();

				// Cancel the request
				callback('');
			});
		});
	}

	/** Register the listeners between ipcMain and ipcRenderer */
	private static registerIpcEventListeners(): void {
		info('Registering ipc event listeners');

		ipcMain.on(MESSAGE_EXIT_CLIENT, app.quit);
	}

	/** Set the app name and the userdata path properly under development. */
	private static setAppName(): void {
		if (IS_DEVELOPMENT) {
			app.setName(CLIENT_NAME);
			app.setPath('userData', join(app.getPath('appData'), CLIENT_NAME));
		}
	}

	/** Get Electron flags and append them. */
	private static setAppFlags(): void {
		info('Setting Electron flags');

		const { appendSwitch } = app.commandLine;
		for (const [flag, value] of ELECTRON_FLAGS) appendSwitch(flag, value);
	}

	/** Register resource swapper file protocols */
	private static registerFileProtocols(): void {
		// Register resource swapper file protocols.
		// TODO: Dynamic protocol source.
		const protocolSource = global.resourceswapProtocolSource;

		protocol.registerFileProtocol(CLIENT_NAME, ({ url }, callback) => {
			callback(decodeURI(`${ protocolSource }${
				url.replace(`${ CLIENT_NAME }:`, '')
			}`));
		});
	}

	/** Enable ad and tracker blocking */
	private static async enableTrackerBlocking(): Promise<unknown> {
		return ElectronBlocker.fromPrebuiltFull(fetch, {
			path: `${ app.getPath('userData') }/electronblocker-cache.bin`,
			read: fs.readFile,
			write: fs.writeFile
		}).then(blocker => blocker.enableBlockingInSession(session.defaultSession));
	}

}

// Register the protocol source for the resource swapper.
// TODO: User-specified protocol source in settings.
global.resourceswapProtocolSource = join(app.getPath('documents'), `/${ CLIENT_NAME }`);
protocol.registerSchemesAsPrivileged([
	{
		scheme: CLIENT_NAME,
		privileges: { secure: true, corsEnabled: true }
	}
]);

if (!app.requestSingleInstanceLock()) { app.quit(); } else {
	Application.preAppReady();

	app.whenReady().then(async() => {
		await Application.init();

		info('Client initialized');
	});
}
