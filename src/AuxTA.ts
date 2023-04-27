import puppeteer, {Puppeteer} from "./puppeteer/puppeteer";
import {FunctionHelper} from "./macros/helpers/code.helper";
import path from "path";
import fs from "fs";
import StatusOfStep from "./auxta/enums/status-of.step";
import {UploadModel} from "./auxta/models/upload.model";
import * as dotenv from "dotenv";
import {setupConfig, config as c, setupOverrideConfig} from "./auxta/configs/config";
import {startSuite} from "./auxta/utilities/start-suite.helper";
import {createEmptyReport} from "./auxta/services/report.service";
import Aux2faAuth from "./macros/helpers/Aux2faAuth";
import {GoogleAuthHelper} from "./macros/helpers/googleAuthHelper";


dotenv.config();

class AuxTA extends FunctionHelper {
    public puppeteer: Puppeteer = puppeteer;
    public aux2fa = Aux2faAuth;
    public googleAuth = GoogleAuthHelper
    public config = c;

    private readonly uploadModel: UploadModel;

    constructor() {
        super();
        let file;
        if (!process.env.RPA) {
            try {
                let currentDir = ""
                while (true) {
                    file = path.join(__dirname, currentDir, "auxta.json");
                    if (!fs.existsSync(file)) {
                        currentDir += "../"
                        if (currentDir.length >= 30) {
                            console.log("auxta.json file not found!")
                            process.exit(1);
                            return;
                        }
                        continue;
                    }
                    break;
                }
                const jsonConfig = JSON.parse(fs.readFileSync(file).toString());
                try {
                    this.config = setupConfig(jsonConfig)
                } catch (e) {
                    console.log("Missing field in auxta.json:", e)
                }
                this.uploadModel = new UploadModel(jsonConfig.organization, jsonConfig.baseURL, jsonConfig.digitalProduct, jsonConfig.environment);
            } catch (e) {
                console.log("Missing or corrupted config: auxta.json. Searching in location:", file)
                console.log(e);
                process.exit(1);
            }
        } else {
            this.uploadModel = new UploadModel('', '', '', '');
        }
    }

    public async run(event: any, overrideConfig?: any) {
        this.changeModelData(overrideConfig);
        let reportId;
        try {
            if (event.reportId) {
                reportId = event.reportId;
            }
        } catch (e) {
            reportId = undefined;
        }
        const suites = this.config.suitesList.slice(0);
        return startSuite(suites, reportId || await createEmptyReport(this.uploadModel));
    }

    private changeModelData(overrideConfig?: any) {
        if (overrideConfig) {
            if (overrideConfig.digitalProduct) this.uploadModel.digitalProduct = overrideConfig.digitalProduct
            if (overrideConfig.environment) this.uploadModel.environment = overrideConfig.environment
            if (overrideConfig.baseURL) this.uploadModel.baseUrl = overrideConfig.baseURL
            this.config = setupOverrideConfig(overrideConfig)
        }
    }

    public async startBrowser(event: any, callback: any, feature: string, scenario: string, overrideConfig?: any, singleFeature = false, fileName = '') {
        this.changeModelData(overrideConfig);
        if (singleFeature && process.env.ENVIRONMENT !== 'LOCAL') {
            this.uploadModel.reportId = await createEmptyReport(this.uploadModel);
            this.uploadModel.currentSuite = fileName
            this.uploadModel.nextSuites = [];
        }
        return this.puppeteer.run(event, callback, feature, scenario)
    }

    public async startBrowserRPA(event: any, callback: any, baseURL: string, fileName = '') {
        this.changeModelData({
            baseURL: baseURL,
            environment: '',
            digitalProduct: ''
        });
        this.uploadModel.currentSuite = fileName
        return this.puppeteer.runRPA(event, callback)
    }

    public getUploadModel(): UploadModel {
        return this.uploadModel;
    }
}

export const StepStatus = StatusOfStep;

const auxta: AuxTA = new AuxTA();

export default auxta;
