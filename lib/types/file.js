xyz.types.file = {
    put: function (uri, files, settings) {
        console.log(files);
        //TODO add filetype validation (using accept to catch client side injections)
        //TODO check multiple from settings

        if (settings.hasOwnProperty('key')) {
            const key = settings.key;
            const [_, entityClass, entityId, propertyName] = uri.split('/');
            const data = {};
            if (settings.multiple) {
                //TODO content = '[' + files.map(file => file.text()).join(',') + ']';
            } else if (files.length === 0) {
                //TODO
            } else {
                const reader = new FileReader();
                reader.onload = evt => {
                    data[propertyName] = evt.target.result;
                    data[key] = files[0].name;
                    //console.log(`/${entityClass}/${entityId}/${propertyName},${key}`, JSON.stringify(data));
                    xyz.put(`/${entityClass}/${entityId}/${propertyName},${key}`, JSON.stringify(data));

                };
                reader.onerror = evt => {
                    //TODO
                };
                reader.readAsText(files[0], "UTF-8");

            }
        }/* else {
            let content;
            if (settings.multiple) {
                //TODO content = '[' + files.map(file => file.text()).join(',') + ']';
            } else if(files.length===0) {
                //TODO
            }else{
                content = files[0].text();
            }
            xyz.put(uri, content);*/
        // }
    },
    edit: function (uri, content, settings, options) {
        // TODO add id from options (for label for)
        let html = '<input type="file"';
        if (content) {
            html += ` value="${content}"`
        }
        if (settings.multiple) {
            html += ` multiple`;
        }
        if (settings.accept) {
            html += ` accept="${settings.accept}"`;
        }
        //if (options.dynamic) {
        html += ` onChange='xyz.types.file.put("${uri}",event.target.files,${JSON.stringify(settings)});'`;
        //}
        return html + '/>';
    },
    /*view: function (uri, content, settings, options) {
        //TODO use a file viewer:   https://viewerjs.org/
        return content;
    },*/
    validate: function (uri, content, settings, options) {
        //TODO implement client side validation
        //todo mime/accept
        //todo max size
        return true;
    }
}
;