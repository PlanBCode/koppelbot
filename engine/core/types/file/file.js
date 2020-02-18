const extensions = ['txt'];
const viewers = Object.fromEntries(extensions.map(extension => [extension, require('./viewers/' + extension)]));

exports.actions = {
    edit: function (item) {
        const prepareContent = (files) => {
            //TODO add filetype validation (using accept to catch client side injections)
            const data = {};
            if (item.getSetting('multiple')) {
                //TODO content = '[' + files.map(file => file.text()).join(',') + ']';
            } else if (files.length === 0) {
                //TODO
            } else {
                const reader = new FileReader();
                reader.onload = evt => {
                    data['content'] = evt.target.result;
                    const extension = item.getSetting('signature').id.connector.extension;
                    let key;
                    //TODO or extension is mixed extensions for example "json|xml"
                    if (extension && extension !== '*') {
                        key = files[0].name.split('.').splice('.').slice(0, -1).join('.');
                    } else {
                        key = files[0].name;
                    }
                    data['id'] = key;
                    item.patch(data);
                };
                reader.onerror = evt => {
                    //TODO
                };
                reader.readAsText(files[0], "UTF-8");
            }
        };

        // TODO add id from options (for label for)
        const INPUT = document.createElement('INPUT');
        INPUT.type = 'file';
        const content = item.getContent();
        if (content) {
            INPUT.value = content;
        }
        if (item.patch) {
            INPUT.addEventListener('change', event => {
                prepareContent(event.target.files, item.patch);
            });
        }
        INPUT.multiple = item.getSetting('multiple');
        INPUT.accept = item.getSetting('accept');

        return INPUT;
    },
    view: function (item) {
        //TODO use a file viewer:   https://viewerjs.org/
        const DIV_container = document.createElement('DIV');
        DIV_container.classList.add('xyz-file-container');

        const onChangeHandler = node => {
            DIV_container.innerHTML = '';
            const content = item.getContent();
            const extension = content.extension;
            const fallbackExtension = viewers.hasOwnProperty(extension) && typeof viewers[extension].view === 'function'
                ? extension : 'txt';
            const DIV_fileContent = viewers[fallbackExtension].view(item);
            DIV_container.appendChild(DIV_fileContent);
        };
        item.onChange(onChangeHandler);
        onChangeHandler(item);
        //TODO onChange
        return DIV_container;
    },
    validateContent: function (item) {
        //TODO implement client side validation
        //todo mime/accept
        //todo max size
        return true;
    }
};
