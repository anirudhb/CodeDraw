const editorElement = document.getElementById('editor');
const languageElement = document.getElementById('language');
const undoElement = document.getElementById('undo');
const redoElement = document.getElementById('redo');
const convertElement = document.getElementById('convert');
editorElement.addEventListener('changed', function(evt) {
    undoElement.disabled = !evt.detail.canUndo;
    redoElement.disabled = !evt.detail.canRedo;
    convertElement.disabled = !evt.detail.canConvert;
});
editorElement.addEventListener('loaded', function(evt) {
    /**
     * Retrieve the list of available recognition languages
     * @param {Object} The editor recognition parameters
     */
    const currentLanguage = evt.target.editor.configuration.recognitionParams.v4.lang;
    const res = MyScript.getAvailableLanguageList();
    Object.keys(res.result).forEach(function(key) {
        const selected = currentLanguage === key;
        languageElement.options[languageElement.options.length] = new Option(res.result[key], key, selected, selected);
    });
    languageElement.disabled = false;
});
languageElement.addEventListener('change', function(e) {
    const configuration = editorElement.editor.configuration;
    //The path to the language depend of the version of API you are using.
    //configuration.recognitionParams.v4.lang = e.target.value;
    //editorElement.editor.configuration = configuration;
});
undoElement.addEventListener('click', function() {
    editorElement.editor.undo();
});
redoElement.addEventListener('click', function() {
    editorElement.editor.redo();
});
convertElement.addEventListener('click', function() {
        editorElement.editor.convert();
    })
    /**
     * Attach an editor to the document
     * @param {Element} The DOM element to attach the ink paper
     * @param {Object} The recognition parameters
     */
MyScript.register(editorElement, {
    recognitionParams: {
        type: 'DIAGRAM',
        protocol: 'WEBSOCKET',
        apiVersion: 'V4',
        server: {
            applicationKey: secrets.applicationKey,
            hmacKey: secrets.hmacKey
        },
    }
});

var defaultLevel = 'DEBUG';
Object.keys(MyScript.Constants.Logger).forEach(function(key) {
    var name = MyScript.Constants.Logger[key];
    var logger = MyScript.LoggerConfig.getLogger(name);
    logger.setLevel(defaultLevel, false);
});
window.addEventListener('resize', function() {
    editorElement.editor.resize();
});