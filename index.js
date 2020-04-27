const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const cron = require("node-cron");
const fs = require("fs");
const express = require("express");
const { promisify } = require("util");
const lighthouseConfig = require("./lighthouserc.json");

const app = express();

const writeFile = promisify(fs.writeFile);

const REPORT_ROOT_PATH = "reports"; // lighthouse json reports root folder
const {
  ci: {
    collect: { settings, url: urls }
  }
} = lighthouseConfig;

const launchChromeAndRunLighthouse = (url, opts, config = null) =>
  chromeLauncher.launch({ chromeFlags: opts.chromeFlags }).then(chrome => {
    opts.port = chrome.port;
    return lighthouse(url, opts, config).then(results => {
      // use results.lhr for the JS-consumable output
      // https://github.com/GoogleChrome/lighthouse/blob/master/types/lhr.d.ts
      // use results.report for the HTML/JSON/CSV output as a string
      // use results.artifacts for the trace/screenshots/other specific case you need (rarer)
      return chrome.kill().then(() => ({
        js: results.lhr,
        json: results.report
      }));
    });
  });

const opts = {
  disableDeviceEmulation: true,
  disableCpuThrottling: true,
  chromeFlags: settings.chromeFlags
};

const createReportFolder = url => {
  const urlObj = new URL(url);
  let dirName = REPORT_ROOT_PATH + "/" + urlObj.host.replace("www.", "");
  if (urlObj.pathname !== "/") {
    dirName = dirName + urlObj.pathname.replace(/\//g, "_");
  }
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName);
  }
  return dirName;
};

// Usage:
cron.schedule(settings.cronExpression, async () => {
  if (urls.length > 0) {
    // create reports root folder
    if (!fs.existsSync(REPORT_ROOT_PATH)) {
      fs.mkdirSync(REPORT_ROOT_PATH);
    }

    // run lighthouse check against each url
    for (const url of urls) {
      console.log(`Running lighthouse check for ${url}...`);
      const results = await launchChromeAndRunLighthouse(url, opts);
      const dirName = createReportFolder(url);
      await writeFile(
        `${dirName}/${results.js["fetchTime"].replace(/:/g, "_")}.json`,
        results.json
      );
    }
  }
});

app.listen("3128");
