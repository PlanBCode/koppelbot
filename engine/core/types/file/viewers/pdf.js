const pdfjsLib = require('./pdf/pdf');

exports.view = function(item){
    const content = item.getContent();
    const fileContent = content.content;

    const CANVAS = document.createElement('CANVAS');
    //TODO check if fileContent.encoding === 'base64', else transform
    const pdfData = atob(fileContent.content);

    // The workerSrc property shall be specified.
    pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';

    // Using DocumentInitParameters object to load binary data.
    const loadingTask = pdfjsLib.getDocument({data: pdfData});
    loadingTask.promise.then( pdf => {
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
            renderTask.promise.then( () => {
                console.log('Page rendered');
            });
        });
    }, function (reason) {
        // PDF loading error TODO handle with css class
        console.error(reason);
    });

    return CANVAS;
};