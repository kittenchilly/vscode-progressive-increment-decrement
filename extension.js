/*!
 * vscode-progressive-increment
 * https://github.com/narsenico/vscode-progressive-increment
 *
 * @author Gianfranco Caldi.
 * @version 1.0.3
 * @license MIT
 */
const vscode = require('vscode');

/**
 * Incrementa progressivamente tutte i numeri interi trovati nelle selezioni.
 * Quindi se il primo numero trovato è 0, questo verrà portato a 0 + increment.
 * Per i numeri successivi non importa il loro valore attuale, verranno sempre incrementati
 * rispetto al numero precedente.
 * Se possibile cerca sempre di mantenere la lunghezza del numero originale nel caso fillando con
 * degli '0'.
 * Es: 0 0 0 => 1 2 3
 * Es: 00 00 00 => 01 02 03
 * Es: 0 10 12 => 1 02 03
 *
 * Se è attiva l'opzione skipFirstNumber il primo numero trovato nelle selezioni non viene incrementato,
 * ma viene comunque considerato come valore iniziale per incrementare i successivi numeri.
 * Es: 0 0 0 => 0 1 2
 *
 * @param {function} incrementor funzione di incremento
 * @param {object} options opzioni
 * - skipFirstNumber: il primo numero non viene incrementato
 * @returns {Promise|undefined} ritorna una promessa se ci sono delle selezioni
 * in cui eseguire l'opearazione, altirmenti undefined
 */
function execIncrementBy(incrementor, options = { skipFirstNumber: false }) {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.selections && editor.selections.length > 0) {
        return editor
            .edit((editBuilder) => {
                const selections = editor.selections;
                let selectionText, replacedText;
                let refValue;
                for (let ii = 0; ii < selections.length; ii++) {
                    selectionText = editor.document.getText(selections[ii]);
                    // cerco tutte le porzioni di stringa contenente valori numerici
                    // e li incremento considerando come valore iniziale il primo numero trovato
                    // cerco di mantenere
                    replacedText = selectionText.replace(/\d+/g, (nn) => {
                        if (refValue === undefined) {
                            refValue = +nn;
                            // se devo skippare il primo valore esco subito
                            if (options.skipFirstNumber) {
                                return nn;
                            }
                        }
                        let val = (refValue = incrementor(refValue)).toString();
                        // se il valore incrementato ha una lunghezza inferiore della stringa nn
                        // presumo che nn sia preceduta da '0'
                        if (val.length < nn.length) {
                            // aggiungo tanti '0' davanti al valore
                            val =
                                Array(nn.length - val.length)
                                    .fill('0')
                                    .join('') + val;
                        }
                        return val;
                    });

                    if (selectionText != replacedText) {
                        editBuilder.replace(selections[ii], replacedText);
                    }
                }
            }) /* .then(resp => {
            console.log('>>> Edit could be applied:', resp);
        }) */
            .catch((err) => {
                console.error(err);
            });
    }
}

function readOptions({ skipFirstNumber }) {
    const config = vscode.workspace.getConfiguration('progressive');
    return {
        skipFirstNumber:
            skipFirstNumber === undefined
                ? config.skipFirstNumber
                : skipFirstNumber,
    };
}

async function askIncrementValue(callback) {
    const options = {
        value: '100',
        prompt: 'Enter incrementation value (eg: 100, -1, 0.5)',
    };
    const increment = +(await vscode.window.showInputBox(options));
    if (increment) {
        const precision = getPrecision(increment);
        callback(createIncrementor(increment, precision));
    }
}

function getPrecision(value) {
    return (/\.(\d+)/.exec(value.toString()) || [])[1] || 0;
}

function fix(number, precision) {
    return Number(number.toFixed(precision));
}

function createIncrementor(increment, precision = 0) {
    return (value) => fix(value + increment, precision);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // implemento i comandi definiti nel package.json
    // i comandi devono ritornare sempre altrimenti vscode non sa quando finiscono
    // (e i test non funzionano)
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'progressive.incrementBy1',
            (skipFirstNumber) =>
                execIncrementBy(
                    createIncrementor(1),
                    readOptions({ skipFirstNumber })
                )
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'progressive.incrementBy10',
            (skipFirstNumber) =>
                execIncrementBy(
                    createIncrementor(10),
                    readOptions({ skipFirstNumber })
                )
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'progressive.incrementByInput',
            (skipFirstNumber) =>
                askIncrementValue((incrementor) =>
                    execIncrementBy(
                        incrementor,
                        readOptions({ skipFirstNumber })
                    )
                )
        )
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
