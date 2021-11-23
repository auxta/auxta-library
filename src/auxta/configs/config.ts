export function setupConfig(jsonConfig: any) {
    if (!jsonConfig.baseURL) throw new Error("baseURL");
    config.baseURL = jsonConfig.baseURL;
    if (!jsonConfig.digitalProduct) throw new Error("digitalProduct");
    config.digitalProduct = jsonConfig.digitalProduct;
    if (!jsonConfig.testsURL) throw new Error("testsURL");
    config.netlifyPath = (process.env.ENVIRONMENT == 'LOCAL') ? 'http://localhost:9999/' : jsonConfig.testsURL;
    if (!jsonConfig.organization) throw new Error("organization");
    config.organization = jsonConfig.organization;
    if (!jsonConfig.token) throw new Error("token");
    config.token = jsonConfig.token;
    if (!jsonConfig.email) throw new Error("email");
    config.auxtaCredentials.email = jsonConfig.email;
    if (!jsonConfig.password) throw new Error("password");
    config.auxtaCredentials.password = jsonConfig.password;
    if (!jsonConfig.suitesList) throw new Error("suitesList");
    config.suitesList = jsonConfig.suitesList;
    if (jsonConfig.timeout) config.timeout = jsonConfig.timeout;
}

export let config = {
    auxtaURL: "https://auxta.live/.netlify/functions/",
    baseURL: "",
    siteURL: "",
    organization: "",
    netlifyPath: "",
    digitalProduct: "",
    token: "",
    timeout: 1000,
    suitesList: [],
    auxtaCredentials: {
        email: "",
        password: "",
    },
}