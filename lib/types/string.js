string = {
    edit: function (uri, content, settings, options) {
        //TODO add validation regex
        let html = '<input';
        if (content) {
            html += ` value="${content}"`
        }
        if (options.dynamic) {
            html += ` oninput="xyz.put('${uri}',event.target.value);"`
        }
        return html + '/>';
    },
    view: function (uri, content, settings, options) {
        return content;
    },
    validate: function (uri, content, settings, options) {
        //TODO implement client side validation
        return true;//TODO
    }
};