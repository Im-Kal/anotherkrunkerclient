require('./aliases');
import Electron = require('electron');

const { app } = require('electron');
const { info } = require('electron-log');
const {
	CLIENT_NAME,
	CLIENT_AUTHOR,
	CLIENT_LICENSE_PERMALINK
} = require('@constants');
const SplashUtils = require('@splash-utils');
const EventHandler = require('@event-handler');

// eslint-disable-next-line no-console
console.log(`${ CLIENT_NAME }  Copyright (C) 2022  ${ CLIENT_AUTHOR }
This program comes with ABSOLUTELY NO WARRANTY.
This is free software, and you are welcome to redistribute it under certain
conditions; read ${ CLIENT_LICENSE_PERMALINK } for more details.\n`);

class Application {

	private splashWindow: Electron.BrowserWindow | undefined;

	private eventHandler = new EventHandler();

	/**
	 * @description
	 * Set flags, event listeners before the app is ready.
	 */
	public constructor() {
		info('Constructing initializer class');

		SplashUtils.setFlags(app);
		this.eventHandler.registerEventListeners();
	}

	/**
	 * @returns {Promise<boolean>} Successful initialization
	 * @description
	 * Initialize the app and create the splash window.
	 */
	public async init(): Promise<boolean> {
		info('Initializing splash window');
		const splashLoadTime = Date.now();

		this.splashWindow = SplashUtils.createSplashWindow();
		await SplashUtils.load(this.splashWindow);

		info(`Splash window done after ${ Date.now() - splashLoadTime } ms`);
		info('Initializing game window');

		return true;
	}

}

const client = new Application();
app.on('ready', async() => {
	await client.init();

	info('Client initialized');
});
