// For reference:  https://github.com/mozilla/pdf.js

let externalScriptIsLoaded = false;

function loadExternalScript(callback) {
    if (externalScriptIsLoaded) {
        callback();
    }
    const SCRIPT = document.createElement('script');
    SCRIPT.setAttribute("type", "text/javascript");
    SCRIPT.setAttribute("src", '//mozilla.github.io/pdf.js/build/pdf.js');

    SCRIPT.onreadystatechange = () => {
        /* TODO

            if (!done) {
                state = scr.readyState;
                if (state === "complete") {
                    handleLoad();
                }
            }
         */
    };
    SCRIPT.onerror = () => {
        //TODO
    };

    SCRIPT.onload = () => {
        externalScriptIsLoaded = true;
        // The workerSrc property shall be specified.
        pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';
        callback();
    };
    document.head.appendChild(SCRIPT);
}

exports.view = function (item) {
    const content = item.getContent();
    const fileContent = content.content;

    const CANVAS = document.createElement('CANVAS');
    //TODO check if fileContent.encoding === 'base64', else transform
    const pdfData = atob(fileContent.content);

    loadExternalScript(() => {
        // Using DocumentInitParameters object to load binary data.
        const loadingTask = pdfjsLib.getDocument({data: pdfData});
        loadingTask.promise.then(pdf => {
            // Fetch the first page
            const pageNumber = 1;
            pdf.getPage(pageNumber).then(page => {
                const scale = 1.5;
                const viewport = page.getViewport({scale: scale});

                // Prepare canvas using PDF page dimensions
                const context = CANVAS.getContext('2d');
                CANVAS.height = viewport.height;
                CANVAS.width = viewport.width;

                // Render PDF page into canvas context
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                const renderTask = page.render(renderContext);
                renderTask.promise.then(() => {
                    // TODO console.log('Page rendered');
                });
            });
        }, function (reason) {
            // PDF loading error TODO handle with css class
            console.error(reason);
        });
    });
    return CANVAS;
};