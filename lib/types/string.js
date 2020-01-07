string = {
    edit: function (content, settings, options) {
        return `<input value="${content ? content : ''}">`;
    },
    view: function (content, settings, options) {
        return content;
    }
};