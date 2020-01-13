var xyz =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./source/main.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "../../types/file.js":
/*!******************************************************************************!*\
  !*** /Users/Rouke/Documents/Mijn projecten/koppelbot/site/lib/types/file.js ***!
  \******************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("exports.actions = {\n    edit: function (uri, content, settings, options, onChange) {\n        const prepareContent = (files) => {\n            //TODO add filetype validation (using accept to catch client side injections)\n            //TOD check signature is object\n            let keyPropertyName, contentPropertyName;\n            for (let propertyName in settings.signature) {\n                if (settings.hasOwnProperty('signature') && typeof settings.signature === 'object' && settings.signature !== null) {\n                    //TODO check if settings.signature[propertyName].storage is object\n                    if (settings.signature[propertyName].storage.key) {\n                        keyPropertyName = propertyName;\n                    }\n                    if (settings.signature[propertyName].storage.content) {\n                        contentPropertyName = propertyName;\n                    }\n                }\n            }\n\n            if (keyPropertyName && contentPropertyName) {\n                //const [_, entityClass, entityId, propertyName] = uri.split('/');\n                const data = {};\n                if (settings.multiple) {\n                    //TODO content = '[' + files.map(file => file.text()).join(',') + ']';\n                } else if (files.length === 0) {\n                    //TODO\n                } else {\n                    const reader = new FileReader();\n                    reader.onload = evt => {\n                        data[contentPropertyName] = evt.target.result;\n                        const extension = settings.signature[keyPropertyName].storage.extension;\n                        let key;\n                        //TODO or extension is mixed extensions for example \"json|xml\"\n                        if (extension && extension !== '*') {\n                            key = files[0].name.split('.').splice('.').slice(0, -1).join('.');\n                        } else {\n                            key = files[0].name;\n                        }\n                        data[keyPropertyName] = key;\n                        onChange(data);\n                    };\n                    reader.onerror = evt => {\n                        //TODO\n                    };\n                    reader.readAsText(files[0], \"UTF-8\");\n\n                }\n            }\n        };\n\n        // TODO add id from options (for label for)\n        const INPUT = document.createElement('INPUT');\n        INPUT.type = 'file';\n        if (content) {\n            INPUT.value = content;\n        }\n        if (onChange) {\n            INPUT.addEventListener('change', event => {\n                prepareContent(event.target.files, onChange);\n            });\n        }\n        if (settings.multiple) {\n            INPUT.multiple = true;\n        }\n        if (settings.accept) {\n            INPUT.accept = settings.accept;\n        }\n        return INPUT;\n    },\n    /*view: function (uri, content, settings, options) {\n        //TODO use a file viewer:   https://viewerjs.org/\n        return content;\n    },*/\n    validate: function (uri, content, settings, options) {\n        //TODO implement client side validation\n        //todo mime/accept\n        //todo max size\n        return true;\n    }\n};\n\n//# sourceURL=webpack://xyz//Users/Rouke/Documents/Mijn_projecten/koppelbot/site/lib/types/file.js?");

/***/ }),

/***/ "../../types/string.js":
/*!********************************************************************************!*\
  !*** /Users/Rouke/Documents/Mijn projecten/koppelbot/site/lib/types/string.js ***!
  \********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("exports.actions = {\n    edit: function (uri, content, settings, options, onChange) {\n        const INPUT = document.createElement('INPUT');\n        if (content) {\n            INPUT.value = content;\n        }\n        if (onChange) {\n            INPUT.oninput = event => onChange(event.target.value);\n        }\n\n        // TODO add id from options (for label for)\n        //TODO add validation regex\n\n        return INPUT;\n    },\n    view: function (uri, content, settings, options) {\n        const TEXT = document.createTextNode(content);\n        return TEXT;\n    },\n    validate: function (uri, content, settings, options) {\n        //TODO implement client side validation\n        return true;//TODO\n    }\n};\n\n//# sourceURL=webpack://xyz//Users/Rouke/Documents/Mijn_projecten/koppelbot/site/lib/types/string.js?");

/***/ }),

/***/ "./source/display/list.js":
/*!********************************!*\
  !*** ./source/display/list.js ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("exports.render = (options, xyz) => (PARENT, content, key, uri, status, depth, primitive) => {\n    if (depth === 0) {\n        const TABLE = document.createElement('TABLE');\n        TABLE.className = 'xyz-list';\n        const TR_header = document.createElement('TR');\n        TR_header.className = 'xyz-list-header';\n        if (options.multiSelect) {\n            const TD = document.createElement('TD');\n            TR_header.appendChild(TD);\n        }\n        TABLE.appendChild(TR_header);\n        PARENT.appendChild(TABLE);\n        return TABLE;\n    } else if (depth === 2) {\n        const TABLE = PARENT;\n        const entityId = key;\n        const TR = document.createElement('TR');\n        TR.className = 'xyz-list-item';\n        if (options.multiSelect) {\n            const variableName = options.multiSelect;\n            const TD = document.createElement('TD');\n            const INPUT = document.createElement('INPUT');\n            INPUT.type = \"checkbox\";\n            INPUT.onclick = event => {\n                const entityIds = xyz.hasVariable(variableName)\n                    ? xyz.getVariable(variableName).split(',')\n                    : [];\n                if (INPUT.checked) {\n                    if (!entityIds.includes(entityId)) {\n                        entityIds.push(entityId);\n                    }\n                } else {\n                    const index = entityIds.indexOf(entityId);\n                    if (index !== -1) {\n                        entityIds.splice(index, 1);\n                    }\n                }\n                if (entityIds.length === 0) {\n                    xyz.clearVariable(variableName);\n                } else {\n                    xyz.setVariable(variableName, entityIds.join(','));\n                }\n                event.stopPropagation();\n            };\n            TD.appendChild(INPUT);\n            TR.appendChild(TD);\n        }\n        if (options.select) {\n            if (xyz.getVariable(options.select) === entityId) {\n                TR.classList.add('xyz-list-selected');\n            }\n            TR.onclick = () => {\n                xyz.setVariable(options.select, entityId);\n                for (let row of TABLE.childNodes) {\n                    if (row === TR) {\n                        row.classList.add('xyz-list-selected');\n                    } else {\n                        row.classList.remove('xyz-list-selected');\n                    }\n                }\n            };\n        }\n        TABLE.appendChild(TR);\n        return TR;\n    } else if (primitive) {\n        const TR = PARENT;\n        const TABLE = TR.parentNode;\n        const TR_header = TABLE.firstChild;\n        let found = false;\n        for (let TD_header of TR_header.childNodes) {\n            if (TD_header.innerHTML === key) {\n                found = true;\n                break;\n            }\n        }\n        if (!found) {\n            const TD_header = document.createElement('TD');\n            TD_header.innerHTML = key;\n            TR_header.appendChild(TD_header);\n        }\n        const TD = document.createElement('TD');\n        TD.appendChild(content);\n        TR.appendChild(TD);\n        return null;\n    } else {\n        return PARENT;\n    }\n};\n\n//# sourceURL=webpack://xyz/./source/display/list.js?");

/***/ }),

/***/ "./source/display/view.js":
/*!********************************!*\
  !*** ./source/display/view.js ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("exports.render = (options, xyz) => (PARENT, content, key, uri, status, depth, primitive) => {\n    if (depth === 0) {\n        const TABLE = document.createElement('TABLE');\n        PARENT.appendChild(TABLE);\n        return TABLE;\n    } else if (primitive) {\n        const TR = document.createElement('TR');\n        if (options.showLabel !== false) {\n            const TD_label = document.createElement('TD');\n            TD_label.innerHTML = key;\n            TR.appendChild(TD_label);\n        }\n        const TD_content = document.createElement('TD');\n        TD_content.innerHTML = content;\n        TR.appendChild(content);\n        PARENT.appendChild(TR);\n        return null;\n    } else {\n        return PARENT;\n    }\n};\n\n//# sourceURL=webpack://xyz/./source/display/view.js?");

/***/ }),

/***/ "./source/entity/entity.js":
/*!*********************************!*\
  !*** ./source/entity/entity.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const Property = __webpack_require__(/*! ./property.js */ \"./source/entity/property.js\").constructor;\nconst Response = __webpack_require__(/*! ../response/response.js */ \"./source/response/response.js\").constructor;\n\nexports.constructor = function Entity(entityClass, meta) {\n    const properties = {};\n    for (let propertyName in meta) {\n        properties[propertyName] = new Property(propertyName, meta[propertyName]);\n    }\n\n    this.createResponse = (status, content) => {\n        const response = new Response();\n        if (status === 207) {\n            for (let propertyName in properties) {//TODO check if data is of this shape\n                const property = properties[propertyName];\n                const subStatus = content[propertyName].status; //TODO check if data is of this shape\n                const subContent = content[propertyName].content;\n                const subResponse = property.createResponse(subStatus, subContent);\n                response.set(propertyName, subResponse)\n            }\n        } else if (status === 200) {\n            for (let propertyName in properties) {//TODO check if data is of this shape\n                const property = properties[propertyName];\n                const subContent = content[propertyName];\n                const subResponse = property.createResponse(200, subContent);\n                response.set(propertyName, subResponse)\n            }\n        } else {\n            //TODO problems\n        }\n        return response;\n    };\n\n    this.createCreator = (options, data) => {\n        const TABLE = document.createElement('TABLE');\n        for (let propertyName in properties) {\n            for (let TR of properties[propertyName].createCreator(options, data)) {\n                TABLE.appendChild(TR);\n            }\n        }\n        return TABLE;\n    };\n\n    this.getIdFromContent = data => {\n        if (typeof data !== 'object' || data === null) {//TODO is_object\n            return null;\n        }\n        for (let propertyName in properties) {\n            if (data.hasOwnProperty(propertyName)) {\n                const id = properties[propertyName].getIdFromContent(data[propertyName]);\n                if (id) {\n                    return id;\n                }\n            }\n        }\n        return null;\n    };\n};\n\n//# sourceURL=webpack://xyz/./source/entity/entity.js?");

/***/ }),

/***/ "./source/entity/property.js":
/*!***********************************!*\
  !*** ./source/entity/property.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const Response = __webpack_require__(/*! ../response/response.js */ \"./source/response/response.js\").constructor;\nconst types = __webpack_require__(/*! ../types/types.js */ \"./source/types/types.js\").types;\n\nexports.constructor = function Property(propertyName, meta) {\n\n    let isPrimitive = true;\n    let isId = false;\n    const subProperties = {};\n    const type = meta.type;\n    //TODO handle type alliasses?\n    const settings = meta; //TODO check if object\n    if (settings.hasOwnProperty('storage')) {\n        if (settings.storage.key) {\n            isId = true;\n        }\n    }\n    if (settings.hasOwnProperty('signature')) {\n        isPrimitive = false;\n        for (let propertyName in settings.signature) {\n            subProperties[propertyName] = new Property(propertyName, settings.signature[propertyName]);\n        }\n    }\n\n    this.createResponse = (status, content) => {\n        const response = new Response();\n        if (isPrimitive) {\n            response.setContent(status, content);\n        } else if (status === 207) {\n            for (let propertyName in subProperties) {//TODO check if data is of this shape\n                const property = subProperties[propertyName];\n                const subStatus = content[propertyName].status; //TODO check if data is of this shape\n                const subContent = content[propertyName].content;\n                const subResponse = property.createResponse(subStatus, subContent);\n                response.set(propertyName, subResponse)\n            }\n        } else if (status === 200) {\n            for (let propertyName in subProperties) {//TODO check if data is of this shape\n                const property = subProperties[propertyName];\n                const subContent = content[propertyName];\n                const subResponse = property.createResponse(200, subContent);\n                response.set(propertyName, subResponse)\n            }\n        } else {\n\n            //TODO problems\n        }\n        return response;\n    };\n\n    this.createCreator = (options, data) => {\n        const TRs = [];\n        if (types.hasOwnProperty(type) && types[type].hasOwnProperty('edit')) {\n            const uri = ''; //TODO\n            const content = settings.hasOwnProperty('default') ? settings.default : null;\n            // TODO html label for gebruiken\n            const TR = document.createElement('TR');\n            const TD_label = document.createElement('TD');\n            TD_label.innerText = propertyName;\n            TR.appendChild(TD_label);\n            const onChange = content => {\n                data[propertyName] = content;\n            };\n            const element = types[type].edit(uri, content, settings, options, onChange);\n            const TD_content = document.createElement('TD');\n            TD_content.appendChild(element);\n            TR.appendChild(TD_content);\n            TRs.push(TR);\n        } else if (!isPrimitive) {\n            for (let propertyName in subProperties) {\n                data[propertyName] = {};\n                TRs.push(...subProperties[propertyName].createCreator(options, data[propertyName]));\n            }\n        }\n        return TRs;\n    };\n\n    this.getIdFromContent = data => {\n        if (isPrimitive) {\n            return isId ? data : null;\n        } else {\n\n            if (typeof data !== 'object' || data === null) { //TODO is_object\n                return null;\n            }\n\n            for (let subPropertyName in subProperties) {\n                if (data.hasOwnProperty(subPropertyName)) {\n                    const id = subProperties[subPropertyName].getIdFromContent(data[subPropertyName]);\n                    if (id) {\n                        return id;\n                    }\n                }\n            }\n            return null;\n        }\n    };\n};\n\n//# sourceURL=webpack://xyz/./source/entity/property.js?");

/***/ }),

/***/ "./source/main.js":
/*!************************!*\
  !*** ./source/main.js ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const Entity = __webpack_require__(/*! ./entity/entity.js */ \"./source/entity/entity.js\").constructor;\nconst Response = __webpack_require__(/*! ./response/response.js */ \"./source/response/response.js\").constructor;\nconst uriTools = __webpack_require__(/*! ./uri/uri.js */ \"./source/uri/uri.js\");\nconst types = __webpack_require__(/*! ./types/types.js */ \"./source/types/types.js\").types;\n\nconst displays = {\n    list: __webpack_require__(/*! ./display/list.js */ \"./source/display/list.js\").render,\n    view: __webpack_require__(/*! ./display/view.js */ \"./source/display/view.js\").render\n};\n\nconst DEFAULT_TYPE = 'string';\nconst DEFAULT_ACTION = 'view';\nconst DEFAULT_DISPLAY = 'view';\nconst DEFAULT_TAG = 'DIV';\n\n\nfunction request(method, uri, data, callback) {\n    //TODO allow for multiple hosts by prepending http(s)://..\n    const location = 'http://localhost:8888/site/'; //TODO determine dynamically\n    const xhr = new XMLHttpRequest();\n    xhr.open(method, location + 'api' + uri, true);\n\n    xhr.onreadystatechange = e => {\n        if (xhr.readyState === 4) {\n            const status = xhr.status;\n            const content = xhr.responseText;\n            callback(status, content);\n        }\n    };\n    xhr.send(data);\n}\n\nfunction XYZ() {\n    const entityClasses = {};\n    const variables = {};\n\n    this.hasVariable = variableName => variables.hasOwnProperty(variableName);\n    this.getVariable = (variableName, fallback) => variables.hasOwnProperty(variableName) ? variables[variableName] : fallback;\n\n    const handleVariableChange = variableName => {\n        for (let uri in uriCallbacks) {\n            if (uri.indexOf('$' + variableName) !== -1) { // TODO find ${variableName} and ignore $variableNameWithPostfix\n                for (let callback of uriCallbacks[uri]) {\n                    handleUri(uri, callback);\n                }\n            }\n        }\n    };\n    this.clearVariable = variableName => {\n        delete variables[variableName];\n        handleVariableChange(variableName);\n    };\n    this.setVariable = (variableName, value) => {\n        if (value !== variables[variableName]) {\n            variables[variableName] = value;\n            handleVariableChange(variableName);\n        }\n    };\n\n    /*========================================================================================\n    NEEDS REWORK\n    ========================================================================================*/\n    const uriCallbacks = {};\n\n    function handleUri(uri, callbacks) {\n        let complete = true;\n        //TODO find ${variableName}\n        uri = uri.replace(/\\$(\\w+)/, (_, variableName) => {\n            if (variables.hasOwnProperty(variableName)) {\n                return variables[variableName];\n            } else {\n                complete = false;\n                return '$' + variableName;\n            }\n        });\n        if (complete) {\n            callbacks.ready(uri);\n        } else {\n            callbacks.wait(uri);\n        }\n    }\n\n    /* setInterval(()=>{\n         for(let uri in uriCallbacks){\n             for(let callback of uriCallbacks[uri]){\n                 handleUri(uri,callback);\n             }\n         }\n     },2000)*/\n\n\n    function registerUri(uri, readyCallback, waitCallback) {\n        const callbacks = {ready: readyCallback, wait: waitCallback};\n        if (!uriCallbacks.hasOwnProperty(uri)) {\n            uriCallbacks[uri] = [callbacks];\n        } else {\n            uriCallbacks[uri].push(callbacks);\n        }\n        handleUri(uri, callbacks);\n    }\n\n    /*========================================================================================\n    ========================================================================================*/\n\n\n    const retrieveMeta = (uri, callback) => {\n        const path = uri.substr(1).split('/');\n        const entityClassNameList = path[0]; // TODO error if no entityClass\n\n        const entityClassNames = entityClassNameList.split(',').filter(entityClass => !entityClasses.hasOwnProperty((entityClass)));\n        if (entityClassNames.length === 0) {\n            callback();\n        } else {\n            request('GET', '/' + entityClassNames.join(',') + '?meta', undefined, (status, content) => {//TODO add querystring better\n                //TODO check status\n                const data = JSON.parse(content); //TODO check\n                for (let entityClassName of entityClassNames) {\n                    entityClasses[entityClassName] = new Entity(entityClassName, data[entityClassName]['*']);\n                }\n                callback();\n            });\n        }\n    };\n\n    const storeData = (uri, status, content) => {\n        //TODO check status\n        content = JSON.parse(content);//TODO check\n        const response = new Response();\n        const path = uri.substr(1).split('/');\n        const entityClassNameList = path[0]; // TODO error if no entityClass\n        const entityIdList = path[1] || '*';\n        const entityClassNames = entityClassNameList.split(',');\n        for (let entityClassName of entityClassNames) {  //TODO handle statusses (207)\n            const entityClassResponse = new Response();\n            const entityClass = entityClasses[entityClassName];\n            let entityIds;\n            if (entityIdList === '*') { //TODO handle statusses (207)\n                entityIds = Object.keys(content[entityClassName]);\n            } else {\n                entityIds = entityIdList.split(',');\n            }\n            for (let entityId of entityIds) {  //TODO handle statusses (207)\n                const entityIdResponse = entityClass.createResponse(status, content[entityClassName][entityId]);\n                entityClassResponse.set(entityId, entityIdResponse);\n            }\n            response.set(entityClassName, entityClassResponse);\n        }\n        return response;\n    };\n\n    // callback = Response =>{}\n    // get the requested uri from cache or request it from server\n    this.get = (uri, callback) => {\n        // get the meta data\n        retrieveMeta(uri, () => {\n            //TODO meta should be good or we have a problem\n            //TODO get the data from cache if already in cache\n            request('GET', uri, undefined, (status, content) => {//TODO add querystring better\n                const response = storeData(uri, status, content);\n                callback(response);\n            });\n        });\n    };\n\n    this.patch = (uri, content, callback) => {\n        content = typeof content === 'string' ? content : JSON.stringify(content);\n        request('PATCH', uri, content, (status, response) => {\n            //TODO check for errors\n            console.log(response)\n            //TODO callback\n        });\n    };\n\n    this.put = (uri, content, callback) => {\n        console.log('put', uri, content)\n        content = typeof content === 'string' ? content : JSON.stringify(content);\n        request('PUT', uri, content, (status, response) => {\n            //TODO check for errors\n            console.log(response)\n            //TODO callback\n        });\n    };\n\n    this.head = (uri, content, callback) => {\n        //TODO\n    };\n    //this.post = (uri,content, callback)=> {};\n\n\n    const renderNode = (action, options) => (content, uri, status,) => {\n        //TODO how to get settings here?\n        const settings = {};\n        const type = settings.type || DEFAULT_TYPE;\n        if (types.hasOwnProperty(type)) {\n            if (types[type].hasOwnProperty(action)) {\n                let onChange;\n                if (action === 'edit') {\n                    onChange = content => {\n                        this.patch(uri, uriTools.wrapContent(uri, content));\n                    }\n                }\n                return types[type][action](uri, content, settings, options, onChange);;\n            } else if (settings.hasOwnProperty('signature')) { // create editor from signature view\n                let html = '';\n                //TODO check if content if object\n                //TODO check if settings.signature is object\n                const DIV = document.createElement('DIV');\n                for (let subPropertyName in settings.signature) {\n                    const subSettings = settings.signature[subPropertyName];\n                    const element = renderNode(action, uri + '/' + subPropertyName, subSettings, options)(status, content[subPropertyName]);\n                    DIV.appendChild(element);\n                }\n                return DIV;\n            } else {\n                //TODO something default and/or error\n            }\n        } else {\n            //TODO something default and/or error\n        }\n    };\n\n    const renderDisplay = (TAG, options) => (uri) => {\n        this.get(uri, response => {\n            const action = options.action || DEFAULT_ACTION;\n            const display = options.display || DEFAULT_DISPLAY;\n            const node = response.transform(renderNode(action, options));\n            const f = node.filter(uri);\n            const mapper = displays[display](options, this); // TODO check if exists,use default or custom otherwise\n            TAG.innerHTML = '';\n            TAG.classList.remove('xyz-waiting');\n            f.map(mapper, TAG);\n        });\n    };\n\n    this.ui = (uri, options) => {\n        options = options || {};\n        const SCRIPT = document.currentScript;\n        const tag = options.tag || DEFAULT_TAG;\n        const TAG = document.createElement(tag);\n        if (options.id) {\n            TAG.id = options.id;\n        }\n        if (options.class) {\n            TAG.class = options.class || '';\n        }\n        SCRIPT.parentNode.insertBefore(TAG, SCRIPT);\n        SCRIPT.parentNode.removeChild(SCRIPT);\n        registerUri(uri,\n            renderDisplay(TAG, options),\n            uri => {\n                TAG.classList.add('xyz-waiting');\n                TAG.innerHTML = 'Not ready'\n            }\n        );\n    };\n\n    this.create = (uri, options) => {\n        options = options || {};\n        const SCRIPT = document.currentScript;\n        const tag = options.tag || DEFAULT_TAG;\n        const TAG = document.createElement(tag);\n        if (options.id) {\n            TAG.id = options.id;\n        }\n        if (options.class) {\n            TAG.class = options.class || '';\n        }\n        SCRIPT.parentNode.insertBefore(TAG, SCRIPT);\n        SCRIPT.parentNode.removeChild(SCRIPT);\n\n        retrieveMeta(uri, () => {\n            const entityClassName = uriTools.pathFromUri(uri)[0];\n            const entityClass = entityClasses[entityClassName];\n            const data = {};\n            const TABLE = entityClass.createCreator(options, data);\n            TAG.appendChild(TABLE);\n            const INPUT = document.createElement('INPUT');\n            INPUT.type = 'submit';\n            INPUT.onclick = () => {\n                const entityId = entityClass.getIdFromContent(data);\n                this.put(uri + '/' + entityId, {[entityClassName]: {[entityId]: data}},);\n            };\n            TAG.appendChild(INPUT);\n        });\n    }\n\n}\n\nconst xyz = new XYZ();\nexports.ui = xyz.ui;\nexports.create = xyz.create;\n\n//# sourceURL=webpack://xyz/./source/main.js?");

/***/ }),

/***/ "./source/response/response.js":
/*!*************************************!*\
  !*** ./source/response/response.js ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const uriTools = __webpack_require__(/*! ../uri/uri.js */ \"./source/uri/uri.js\");\n\nexports.constructor = function Response() {\n    let primitive;\n    const subResponses = {};\n    let status;\n    let content;\n    this.getStatus = () => status;\n    this.getContent = () => {\n        //TODO if not primitive => throw\n        return content;\n    };\n    this.setContent = (status_, content_) => {\n        primitive = true;\n        status = status_;\n        content = content_;\n    };\n    this.set = (key, subResponse) => {\n        primitive = false;\n        const subStatus = subResponse.getStatus();\n        subResponses[key] = subResponse;\n        if (Object.keys(subResponses).length === 0) {\n            status = subStatus;\n        } else if (status !== subStatus) {\n            status = 207;\n        }\n    };\n    this.isPrimitive = () => primitive;\n\n    // func = (subResponse, propertyName, response) => {}\n    this.forEach = func => {\n        if (primitive === true) {\n            //TODO throw error\n        } else {\n            for (let propertyName in subResponses) {\n                const subResponse = subResponses[propertyName];\n                func(subResponse, propertyName, this);\n            }\n        }\n    };\n    this.toObject = () => {\n        if (primitive === true) {\n            return content;\n        } else if (primitive === false) {\n            const object = {};\n            for (let propertyName in subResponses) {\n                object[propertyName] = subResponses[propertyName].toObject();\n            }\n            return object;\n        } else {\n            return undefined;\n        }\n\n    };\n    // transformation = (content,  uri, status, depth) => {...}\n    this.transform = (transformation, uri, depth) => {\n        uri = typeof uri === 'undefined' ? '' : uri;\n        depth = typeof depth === 'undefined' ? 0 : depth;\n        const node = new Response();\n        if (primitive) {\n            const transformedContent = transformation(content, uri, status, depth);\n            node.setContent(status, transformedContent);\n        } else {\n            this.forEach((subResponse, key) => {\n                const transformedSubResponse = subResponse.transform(transformation, uri + '/' + key, depth + 1);\n                node.set(key, transformedSubResponse);\n            })\n        }\n        return node;\n    };\n    // reduction = ( accumulator, content, uri, status, depth, primitive) => {...}\n    this.reduce = (reduction, base, uri, depth) => {\n        uri = typeof uri === 'undefined' ? '' : uri;\n        depth = typeof depth === 'undefined' ? 0 : depth;\n        let accumulator = base;\n        if (primitive) {\n            accumulator = reduction(accumulator, content, uri, status, depth, true);\n        } else {\n            for (let propertyName in subResponses) {\n                const subResponse = subResponses[propertyName];\n                const subContent = subResponse.reduce(reduction, base, uri + '/' + propertyName, depth + 1);\n                accumulator = reduction(accumulator, subContent, uri, status, depth, false);\n            }\n        }\n        return accumulator;\n    };\n\n    // mapping = ( accumulator, content, key, uri, status, depth, primitive) => {...}\n    this.map = (mapping, parent, key, uri, depth) => {\n        uri = typeof uri === 'undefined' ? '' : uri;\n        depth = typeof depth === 'undefined' ? 0 : depth;\n        key = typeof key === 'undefined' ? '' : key;\n        if (primitive) {\n            mapping(parent, content, key, uri, status, depth, true);\n            return null;\n        } else {\n            const node = mapping(parent, content, key, uri, status, depth, false);\n            for (let propertyName in subResponses) {\n                const subResponse = subResponses[propertyName];\n                subResponse.map(mapping, node, propertyName, uri + '/' + propertyName, depth + 1);\n            }\n            return node;\n        }\n    };\n    this.filter_ = path => {\n        if (path.length === 0 && primitive) {\n            const response = new Response();\n            response.setContent(status, this.toObject());\n            return response;\n        }\n        const response = new Response();\n        let propertyNames;\n        if (path[0] === '*' || path.length === 0) {\n            propertyNames = Object.keys(subResponses);\n        } else {\n            propertyNames = path[0].split(',');\n        }\n        for (let propertyName of propertyNames) {\n            const subResponse = subResponses[propertyName].filter_(path.slice(1));\n            response.set(propertyName, subResponse);\n        }\n        return response;\n    };\n\n    this.filter = uri => {\n        return this.filter_(uriTools.pathFromUri(uri));\n    };\n    this.keys = () => Object.keys(subResponses);\n    this.has = key => subResponses.hasOwnProperty(key);\n    this.get = key => subResponses[key];\n};\n\nexports = Response;\n\n//# sourceURL=webpack://xyz/./source/response/response.js?");

/***/ }),

/***/ "./source/types/types.js":
/*!*******************************!*\
  !*** ./source/types/types.js ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("exports.types = {\n    file: __webpack_require__(/*! ../../../../types/file.js */ \"../../types/file.js\").actions,\n    string: __webpack_require__(/*! ../../../../types/string.js */ \"../../types/string.js\").actions\n};\n\n//# sourceURL=webpack://xyz/./source/types/types.js?");

/***/ }),

/***/ "./source/uri/uri.js":
/*!***************************!*\
  !*** ./source/uri/uri.js ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("const pathFromUri = uri => {\n    if (uri.startsWith('/')) {\n        uri = uri.substr(1);\n    }\n    if (uri.endsWith('/')) {\n        uri = uri.slice(0, -1);\n    }\n    return uri.split('/');\n};\n\nconst wrapContent = (uri, content) => {\n    const wrapper = {};\n    const path = pathFromUri(uri);\n    let wrapperIterator = wrapper;\n    for (let depth = 0; depth < path.length; ++depth) {\n        const key = path[depth];\n        wrapperIterator = wrapperIterator[key] = (depth === path.length - 1) ? content : {};\n    }\n    return wrapper;\n};\n\nexports.pathFromUri = pathFromUri;\nexports.wrapContent = wrapContent;\n\n//# sourceURL=webpack://xyz/./source/uri/uri.js?");

/***/ })

/******/ });