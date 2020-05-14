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
            return new util.TestResult(util.match(content, expectedContent), `Content ${JSON.stringify(content)} did not match expected content ${JSON.stringify(expectedContent)}.`)
        });
        return this;
    };

    this.statusShouldMatch = expectedStatus => {
        tests.push((status, _) => new util.TestResult(expectedStatus % 256 === status % 256, `Status did not match expected status ${expectedStatus}.`)); // NB: exit codes are capped at 255. 404%255 = 148
        return this;
    };

    const validate = (name, status, content) => {
        try {
            content = JSON.parse(content);
        }catch(e){} // Skip parsing, contentShouldMatch will handle this
        try {
            for (let test of tests) {
                test(status, content).validate();
            }
            console.log('\033[32m[v] Test ' + name + ' succeeded \033[0m');
        } catch (e) {
            console.log('\033[31m[x] Test ' + name + ' failed \033[0m', e);
        }
    };

    this.run = name => {
        child_process.exec(`./xyz --method ${method} '${uri}' '${data}'`,
            {cwd: `${__dirname}/../../..`},
            (error, stdout, stderr) => {
                const status = error === null ? 200 : error.code;
                const content = stdout.toString();
                validate(name, status, content);
            }
        );
    };

    this.runSync = name => {
        let status = 200
        let content;
        const command = `./xyz --method ${method} '${uri}' '${data}'`;
        const options = {cwd: `${__dirname}/../../..`};
        try {
            content = child_process.execSync(command, options).toString();
        } catch (e) {
            status = e.status;
            content = e.stdout.toString();
        }
        validate(name, status, content);
    }
}

function curl(method, uri, data) {
    return new ApiRequest(method, uri, data);
}

exports.curl = curl;