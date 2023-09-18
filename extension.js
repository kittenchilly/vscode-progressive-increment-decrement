/*!
 * vscode-progressive-increment
 * https://github.com/kittenchilly/vscode-progressive-increment-decrement
 *
 * @author Gianfranco Caldi, kittenchilly.
 * @version 1.0.5
 * @license MIT
 */
const vscode = require('vscode');

const SHOW_INPUT_BOX_OPTIONS = {
    value: '100',
    prompt: 'Enter incrementation value',
};

/**
 *Progressively increment all integers found in selections.
 *So if the first number found is 0, this will be increased to 0 + increment.
 *For subsequent numbers, their current value does not matter, they will always be incremented
 *compared to the previous number.
 *If possible always try to keep the length of the original number when filling with
 *of the '0'.
 *Ex: 0 0 0 => 1 2 3
 *Ex: 00 00 00 => 01 02 03
 *Ex: 0 10 12 => 1 02 03
 *
 *@param {function} incrementer increment function
 *@param {object} options options
*-allowZeroLengthSelection: if true in case of long selection 0 increases the number to the left of the cursor or to the right
 *@returns {Promise} A promise that resolves with a value indicating if the edits could be applied.
 */
async function execIncrementWith(incrementor, options) {
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
    const numberBeforeAnchor = /-?\d+$/.exec(textBefore);
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
    const numberAfterAnchor = /^-?\d+/.exec(textAfter);
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

function createReplacer({ editBuilder, document, incrementor }) {
    let refValue;
    return (range) => {
        refValue = replaceInline({
            editBuilder,
            document,
            range,
            incrementor,
            refValue,
        });
    };
}

function replaceInline({
    editBuilder,
    document,
    range,
    incrementor,
    refValue,
}) {
    const selectionText = document.getText(range);
    const replacedText = selectionText.replace(/-?\d+/g, (nn) => {
        let val = incrementor(+nn).toString();
        if (val.length < nn.length) {
            //add many '0's in front of the value
            val = val.padStart(nn.length, '0');
        }

        return val;
    });

    if (selectionText != replacedText) {
        editBuilder.replace(range, replacedText);
    }

    return refValue;
}

function makeOptions({ allowZeroLengthSelection } = {}) {
    const config = vscode.workspace.getConfiguration('progressive');
    return {
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

async function askDecrementValue(executor, testValue) {
    const increment =
        +testValue ||
        parseInt(await vscode.window.showInputBox(SHOW_INPUT_BOX_OPTIONS));
    if (increment > 0) {
        return executor(createDecrementor(increment));
    }
}

function createIncrementor(increment) {
    return (value) => value + increment;
}

function createDecrementor(increment) {
    return (value) => value - increment;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    //I implement the commands defined in the package.json
    //commands must always return otherwise vscode doesn't know when they end
    //(and the tests don't work)
    context.subscriptions.push(
        vscode.commands.registerCommand('progressive.incrementBy1', (options) =>
            execIncrementWith(createIncrementor(1), makeOptions(options))
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'progressive.incrementBy10',
            (options) =>
                execIncrementWith(createIncrementor(10), makeOptions(options))
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'progressive.incrementByInput',
            (options, testValue) =>
                askIncrementValue(
                    (incrementor) =>
                        execIncrementWith(incrementor, makeOptions(options)),
                    testValue
                )
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('progressive.decrementBy1', (options) =>
            execIncrementWith(createDecrementor(1), makeOptions(options))
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'progressive.decrementBy10',
            (options) =>
                execIncrementWith(createDecrementor(10), makeOptions(options))
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'progressive.decrementByInput',
            (options, testValue) =>
                askDecrementValue(
                    (incrementor) =>
                        execIncrementWith(incrementor, makeOptions(options)),
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
