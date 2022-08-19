/*!
 * vscode-progressive-increment
 * https://github.com/narsenico/vscode-progressive-increment
 *
 * @author Gianfranco Caldi.
 * @version 1.0.5
 * @license MIT
 */
const vscode = require('vscode');

const SHOW_INPUT_BOX_OPTIONS = {
    value: '100',
    prompt: 'Enter incrementation value',
};

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
 * - skipFirstNumber: se true il primo numero non viene incrementato
 * - allowZeroLengthSelection: se true in caso di selezione lunga 0 incrementa il numero alla sinistra del cursore oppure alla destra
 * @returns {Promise} A promise that resolves with a value indicating if the edits could be applied.
 */
async function execIncrementBy(incrementor, options) {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.selections && editor.selections.length > 0) {
        const edit = createEditCallback(editor, incrementor, options);
        return editor.edit(edit);
    }
    return Promise.resolve(false);
}

function createEditCallback(editor, incrementor, options) {
    return (editBuilder) => {
        const selections = editor.selections;
        const document = editor.document;
        const replace = createReplacer({
            editBuilder,
            document,
            incrementor,
            options,
        });
        selections.forEach((selection) => {
            if (isZeroLengthSelection(selection)) {
                if (options.allowZeroLengthSelection) {
                    replaceBeforeOrAfter({
                        document,
                        selection,
                        replace,
                    });
                }
            } else {
                replace(selection);
            }
        });
    };
}

function isZeroLengthSelection(selection) {
    return selection.anchor.isEqual(selection.active);
}

function tryGetRangeOfNumberBefore(selection, line) {
    const textBefore = line.text.substring(0, selection.anchor.character);
    const numberBeforeAnchor = /\d+$/.exec(textBefore);
    if (numberBeforeAnchor) {
        const start = numberBeforeAnchor.index;
        const startPosition = selection.anchor.with({
            character: start,
        });
        return new vscode.Range(startPosition, selection.anchor);
    }
    return null;
}

function tryGetRangeOfNumberAfter(selection, line) {
    const textAfter = line.text.substring(selection.anchor.character);
    const numberAfterAnchor = /^\d+/.exec(textAfter);
    if (numberAfterAnchor) {
        const end = selection.anchor.character + numberAfterAnchor[0].length;
        const endPosition = selection.anchor.with({
            character: end,
        });
        return new vscode.Range(selection.anchor, endPosition);
    }
    return null;
}

function replaceBeforeOrAfter({ document, selection, replace }) {
    const line = document.lineAt(selection.anchor);
    const range =
        tryGetRangeOfNumberBefore(selection, line) ||
        tryGetRangeOfNumberAfter(selection, line);
    if (range) {
        replace(range);
    }
}

function createReplacer({ editBuilder, document, incrementor, options }) {
    let refValue;
    return (range) => {
        refValue = replaceInline({
            editBuilder,
            document,
            range,
            incrementor,
            refValue,
            options,
        });
    };
}

function replaceInline({
    editBuilder,
    document,
    range,
    incrementor,
    refValue,
    options,
}) {
    const selectionText = document.getText(range);
    // cerco tutte le porzioni di stringa contenente valori numerici
    // e li incremento considerando come valore iniziale il primo numero trovato
    // cerco di mantenere
    const replacedText = selectionText.replace(/\d+/g, (nn) => {
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
            val = val.padStart(nn.length, '0');
        }
        return val;
    });

    if (selectionText != replacedText) {
        editBuilder.replace(range, replacedText);
    }

    return refValue;
}

function makeOptions({ skipFirstNumber, allowZeroLengthSelection } = {}) {
    const config = vscode.workspace.getConfiguration('progressive');
    return {
        skipFirstNumber:
            skipFirstNumber === undefined
                ? config.skipFirstNumber
                : skipFirstNumber,
        allowZeroLengthSelection:
            allowZeroLengthSelection === undefined
                ? config.allowZeroLengthSelection
                : allowZeroLengthSelection,
    };
}

async function askIncrementValue(executor, testValue) {
    const increment =
        +testValue ||
        parseInt(await vscode.window.showInputBox(SHOW_INPUT_BOX_OPTIONS));
    if (increment > 0) {
        return executor(createIncrementor(increment));
    }
}

function createIncrementor(increment) {
    // sarà utile per future evoluzioni, ad esempio per valori float
    return (value) => value + increment;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // implemento i comandi definiti nel package.json
    // i comandi devono ritornare sempre altrimenti vscode non sa quando finiscono
    // (e i test non funzionano)
    context.subscriptions.push(
        vscode.commands.registerCommand('progressive.incrementBy1', (options) =>
            execIncrementBy(createIncrementor(1), makeOptions(options))
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'progressive.incrementBy10',
            (options) =>
                execIncrementBy(createIncrementor(10), makeOptions(options))
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'progressive.incrementByInput',
            (options, testValue) =>
                askIncrementValue(
                    (incrementor) =>
                        execIncrementBy(incrementor, makeOptions(options)),
                    testValue
                )
        )
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
