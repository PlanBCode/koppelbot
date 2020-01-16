exports.render = (options, xyz) => (PARENT, TAG, key, uri, status, depth, primitive, fullUri) => {
    if (depth === 0) {
        const TABLE = document.createElement('TABLE');
        PARENT.appendChild(TABLE);
        return TABLE;
    } else if (primitive) {
        const TR = document.createElement('TR');
        if (options.showLabel !== false) {
            const TD_label = document.createElement('TD');
            TD_label.innerHTML = key;
            TR.appendChild(TD_label);
        }
        const TD_content = document.createElement('TD');
        TD_content.appendChild(TAG);
        TR.appendChild(TD_content);
        PARENT.appendChild(TR);
        return null;
    } else {
        return PARENT;
    }
};