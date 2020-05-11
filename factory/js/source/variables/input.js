const variables = require('./variables');

function renderUiInput(xyz, options, WRAPPER) {
    const name = options.name; //TODO error if missing

    const INPUT = document.createElement('INPUT');
    if (options.hasOwnProperty('type')) INPUT.type = options.type;
    if (options.hasOwnProperty('value')) {
        if (variables.hasVariable(name)) {
            INPUT.value = variables.getVariable(name, '');
        } else {
            INPUT.value = options.value;
            variables.setVariable(name, options.value);
        }
    }

    const LABEL = document.createElement('LABEL');
    LABEL.innerHTML= name + '&nbsp;';
    WRAPPER.appendChild(LABEL);
    INPUT.name = name;
    INPUT.onpaste = () => variables.setVariable(name, INPUT.value)
    INPUT.oninput = () => variables.setVariable(name, INPUT.value)
    variables.registerUri(xyz, '$' + name, () => {
        INPUT.value = variables.getVariable(name, '');
    });
    WRAPPER.appendChild(INPUT);
}

exports.renderUiInput = renderUiInput;