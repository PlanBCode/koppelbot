const child_process = require('child_process');
const util = require('./util');
const json = require('../source/web/json');

function ApiRequest(method, uri, data) {
    const tests = [];

    this.shouldFail = () => {
        tests.push((status, _) => new util.TestResult(status !== 200, 'Expected failure'));
        return this;
    };

    this.contentShouldMatch = (expectedContent, path) => {
        tests.push((_, content) => {
            if (path) {
                content = json.get(content, path, true);
            }
            return new util.TestResult(util.match(content, expectedContent), `Content "${content}" did not match expected content "${expectedContent}".`)
        });
        return this;
    };

    this.statusShouldMatch = expectedStatus => {
        tests.push((status, _) => new util.TestResult(expectedStatus % 256 === status % 256, 'Status did not match.')); // NB: exit codes are capped at 255. 404%255 = 148
        return this;
    };

    const validate = (status, content) => {
        content = JSON.parse(content);
        for (let test of tests) {
            test(status, content).validate();
        }
    };

    this.run = () => {
        child_process.exec(`./xyz --method ${method} ${uri} ${data}`,
            {cwd: `${__dirname}/../../..`},
            (error, stdout, stderr) => {
                const status = error === null ? 200 : error.code;
                const content = stdout.toString();
                validate(status, content);
            }
        );
    };

    this.runSync = () => {
        let status, content;
        try {
            content = child_process.execSync(`./xyz --method ${method} ${uri} ${data}`, {cwd: `${__dirname}/../../..`});
        } catch (e) {
            status = e.status;
            content = e.stdout.toString();
        }
        validate(status, content);
    }
}

function curl(method, uri, data) {
    return new ApiRequest(method, uri, data);
}

exports.curl = curl;