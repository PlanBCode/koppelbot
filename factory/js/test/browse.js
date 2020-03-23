const child_process = require('child_process');
const jsdom = require("jsdom");
const {JSDOM} = jsdom;

const host = 'http://localhost:8000';

function request(url, method, data, callback) {
    url = url.substr(host.length); // 'http://localhost:8000/api/abc' -> /api/abc'
    child_process.exec(`./xyz '${url}' '${data}' --method ${method} --prefix /`,
        {cwd: `${__dirname}/../../..`},
        callback // (error, stdout, stderr) => {...}
    );
}

function requestSync(url, method, data) {
    return child_process.execSync(`./xyz '${url}' '${data}' --method ${method}  --prefix /`, {cwd: `${__dirname}/../../..`});
}

function XMLHttpRequest() {
    let method;
    let url;
    let async;
    this.open = (method_, url_, async_) => {
        method = method_;
        url = url_;
        async = async_;
    };

    this.send = data => {
        request(url, method, data, (error, stdout, stderr) => {
            this.readyState = 4;
            this.status = error === null ? 200 : error.code;
            this.responseText = stdout.toString();
            this.onreadystatechange();
        });
    }
}

class CustomResourceLoader extends jsdom.ResourceLoader {
    fetch(url, options) {
        return new Promise(function (resolve, reject) {
            const method = typeof options === 'object' && typeof options.method === 'string' ? options.method : 'GET';
            const data = typeof options === 'object' && typeof options.body === 'string' ? options.body : '';
            request(url, method, data, (error, stdout, stderr) => {
                //TODO sterr?
                // const status = error === null ? 200 : error.code;
                resolve(stdout);
            });
        });
    }
}

const resourceLoader = new CustomResourceLoader();

function HtmlPage(url) {
    const tests = [];

    const validate = (name, status, content) => {
        const dom = new JSDOM(content, {
            url: host,
            contentType: "text/html",
            runScripts: "dangerously",
            includeNodeLocations: true,
            resources: resourceLoader

        });

        dom.window.XMLHttpRequest = XMLHttpRequest; // Inject mock XMLHttpRequest implementation
        dom.window.console.log = ()=>{};

        dom.window.onModulesLoaded = () => {
            console.log("ready to roll!");
        };

        /* dom.window.document.addEventListener('DOMContentLoaded', () => {

             console.log(dom.window.document.body.innerHTML);
             try {
                 for (let test of tests) {
                     test(status, content).validate();
                 }
                 console.log('\033[32m[v] Test ' + name + ' succeeded \033[0m');
             } catch (e) {
                 console.log('\033[31m[x] Test ' + name + ' failed \033[0m', e);
             }
         });*/
    };

    this.click = id => {
        //TODO
    };

    this.input = (id, value) => {
        //TODO
    };

    this.run = name => {
        request(url, 'GET', '', (error, stdout, stderr) => {
            const status = error === null ? 200 : error.code;
            const content = stdout.toString();
            validate(name, status, content);
        })
    };

    this.runSync = name => {
        let status, content;
        try {
            content = requestSync(url, 'GET', '');
        } catch (e) {
            status = e.status;
            content = e.stdout.toString();
        }
        validate(name, status, content);
    };
}

function browse(url) {
    return new HtmlPage(url);
}

exports.browse = browse;