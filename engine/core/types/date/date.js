const formats = require('./formats.json');
const Pikaday = require('pikaday');
const moment = require('moment').default

function phpDateFormatToMomentFormat(format){
    let momentFormat = '';
    for (let index = 0; index < format.length; ++index) {
        const c = format.charAt(index);
        if (formats.hasOwnProperty(c)) {
            const format = formats[c];
            momentFormat += format.settings.moment;
        } else {
            momentFormat += c;
        }
    }
    return momentFormat;
}

function phpDateFormatToPlaceholder(format){
    let placeholder = '';
    for (let index = 0; index < format.length; ++index) {
        const c = format.charAt(index);
        if (formats.hasOwnProperty(c)) {
            const format = formats[c];
            placeholder += format.settings.default;
        } else {
            placeholder += c;
        }
    }
    return placeholder;
}

exports.actions = {
    edit: function (item) {
        const format = item.getSetting('format');

        const INPUT = document.createElement('INPUT');
        INPUT.placeholder = phpDateFormatToPlaceholder(format);

        const picker = new Pikaday({ field: INPUT ,
            toString(date) {
             return new moment(date).format(phpDateFormatToMomentFormat(format))
           }
        });

        if (item.patch) {
            INPUT.oninput = () => {
                item.patch(INPUT.value)
            };
        }
        const onChangeHandler = node => {
            //TODO use status
            const content = node.getContent();
            if (INPUT !== document.activeElement) { // we don't want to interrupt typing
                INPUT.value = content;
            }
        };
        item.onChange(onChangeHandler);
        onChangeHandler(item);
        return INPUT;
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
        const format = item.getSetting('format');
        const content = item.getContent();
        if (typeof content !== 'string') return false; //TODO maybe numbers for single date things?

        let contentIndex = 0;
        for (let formatIndex = 0; formatIndex < format.length; ++formatIndex) {
            const format = item.getSetting('format');
            const c = format.charAt(formatIndex);
            if (formats.hasOwnProperty(c)) {
                const subSettings = formats[c].settings;
                const subTypeName = subSettings.type || 'string';
                let length;
                if (subTypeName === 'number') {
                    const leadingZeroes = !!subSettings.leadingZeroes;
                    if (leadingZeroes) {
                        const max = subSettings.max || 0;
                        length = Math.ceil(Math.log10(max));
                    } else {
                        length = content.substring(contentIndex).search(/[^0-9]/);
                        if (length === -1) length = content.length - contentIndex
                    }
                }
                const subContent = content.substr(contentIndex, length);
                const subValid = item.validateContent(subContent, subSettings);
                if (!subValid) return false;
                contentIndex += length;
            } else if (c !== content.charAt(contentIndex)) {
                return false;
            } else {
                ++contentIndex;
            }
        }
        return true;
    },
    toNumber: function(content, item){
        const format = item.getSetting('format');
        return new moment(item.getContent(),phpDateFormatToMomentFormat(format)).unix();
    },
    fromNumber: function(content, item){
        const format = item.getSetting('format');
        return new moment(content).format(phpDateFormatToMomentFormat(format))
    }
};