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
});
undoElement.addEventListener('click', function() {
    editorElement.editor.undo();
});
redoElement.addEventListener('click', function() {
    editorElement.editor.redo();
});
convertElement.addEventListener('click', function() {
    editorElement.editor.convert();
    editorElement.editor.export_();
    let jiix = editorElement.editor.exports["application/vnd.myscript.jiix"];
    console.log(jiix);
    fetch("/jiix2code", {
        method: "POST",
        body: jiix
    }).then(r => r.json()).then(j => {
        console.log(j);
        // Run the code!!!
        eval(j.code);
    });
});
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
        v4: {
            diagram: {
                mimeTypes: ["application/vnd.myscript.jiix"]
            }
        }
    }
});
window.addEventListener('resize', function() {
    editorElement.editor.resize();
});