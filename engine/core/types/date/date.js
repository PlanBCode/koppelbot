//https://www.php.net/manual/en/function.date.php
const formats = require('./formats.json');

exports.actions = {
    edit: function (item) {
        const content = item.getContent();
        const DIV = document.createElement('DIV');
        const format = item.getSetting('format');
        for (let index = 0; index < format.length; ++index) {
            const c = format.charAt(index);
            if (formats.hasOwnProperty(c)) {
                const format = formats[c];
                const subStatus = 200;//TODO
                const subContent = {TODO: ''};//TODO
                const TAG = item.renderSubElement(
                    item.getAction(),
                    [index]
                    , subStatus,
                    subContent,
                    format.settings,
                    {label: format.label}
                );
                DIV.appendChild(TAG);
            }
        }
        return DIV;
    },
    view: function (item) {
        //TODO use displayFormat to render it
        const SPAN = document.createElement('SPAN');
        SPAN.innerText = item.getContent();
        item.onChange(item => {
            SPAN.innerText = item.getContent();
        });
        return SPAN;
    },
    validateContent: function (item) {
        //TODO
        return true;
    }
};