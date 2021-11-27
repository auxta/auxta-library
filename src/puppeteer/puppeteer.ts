import chromium from 'chrome-aws-lambda';
import log from "../auxta/services/log.service";
import { captureScreenshot } from "../auxta/utilities/screenshot.helper";
import { onTestEnd } from "../auxta/hooks/report.hook";
import auxta from "../AuxTA";
import { StepStatusEnum } from "../auxta/enums/step-status.enum";
import { UploadModel } from "../auxta/models/upload.model";
import puppeteer_core from 'puppeteer-core';
import { config } from "./../auxta/configs/config";


export class Puppeteer {
    public defaultPage!: puppeteer_core.Page;
    private browser!: puppeteer_core.Browser;

    public async startBrowser() {
        let args = [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process'
        ];
        if (process.env.ENVIRONMENT != 'LOCAL')
            args.push(`--window-size=${config.screenWidth},${config.screenHeight}`)
        this.browser = await chromium.puppeteer.launch({
            executablePath: process.env.NODE_ENV !== 'production' ? undefined : await chromium.executablePath,
            args,
            defaultViewport: process.env.ENVIRONMENT == 'LOCAL' ? null : {
                width: config.screenWidth,
                height: config.screenHeight
            },
            // Return back to headless for netlify
            headless: process.env.ENVIRONMENT == 'LOCAL' ? false : chromium.headless
        });
        this.defaultPage = (await this.browser.pages())[0];
        await this.defaultPage.goto(config.baseURL)
        await this.defaultPage.waitForNetworkIdle();
    }

    public async close() {
        if (this.browser) {
            let pages = await this.browser.pages();
            await Promise.all(pages.map((page: { close: () => any; }) => page.close()));
            await this.browser.close();
        }
    }

    public async run(event: any, callback: any, featureName = 'Test feature', scenarioName = 'Test scenario', uploadModel?: UploadModel, close?: boolean) {
        if (uploadModel === undefined) uploadModel = auxta.getUploadModel();
        if (close === undefined) close = Puppeteer.setupHeader(event, uploadModel)
        let screenshotBuffer: Buffer;
        let errMessage: string | undefined;
        let statusCode: number = 200;

        let consoleStack = [];
        try {
            await log.push('When', `Starting puppeteer process`, StepStatusEnum.PASSED);
            await this.startBrowser()
            this.defaultPage.on('console', message =>
                consoleStack.push(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
                .on('pageerror', ({ message }) => consoleStack.push(message))
                .on('response', response =>
                    consoleStack.push(`${response.status()} ${response.url()}`))
                .on('requestfailed', request =>
                    consoleStack.push(`${request.failure().errorText} ${request.url()}`))
            await callback(event)
            screenshotBuffer = await captureScreenshot();
            await log.push('When', `Finished puppeteer process`, StepStatusEnum.PASSED);
        } catch (err: any) {
            console.log(`Error ${err}`);
            errMessage = err;
            statusCode = 500;
            screenshotBuffer = await captureScreenshot();
            await log.push('When', `Finished puppeteer process`, StepStatusEnum.FAILED);
        }
        let url = this.defaultPage.url();
        if (close) await this.close();

        await onTestEnd(uploadModel, featureName, scenarioName, statusCode, screenshotBuffer, !errMessage ? undefined : {
            currentPageUrl: url,
            error: errMessage
        });
        log.clear();
    }

    private static setupHeader(event: any, uploadModel: UploadModel) {
        let close = true;
        if (process.env.ENVIRONMENT !== 'LOCAL') {
            const body = JSON.parse(event.body);
            uploadModel.reportId = body.reportId;
            uploadModel.nextSuites = body.nextSuites;
        } else if (event.queryStringParameters.close) {
            close = event.queryStringParameters.close === "true";
        }
        return close;
    }
}

export default new Puppeteer();
