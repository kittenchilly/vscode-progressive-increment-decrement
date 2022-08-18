/* global suite, test */

const assert = require('assert');
const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;

/**
 * Seleziona tutto il contenuto del file ed esegue l'incremento.
 *
 * @param {String} testfile
 * @param {String} expectedfile
 */
async function selectAllAndIncrements(testfile, expectedfile, increment = 1) {
    const inputText = await fs.readFile(testfile, 'utf8');
    const skipFirstNumber = hasSkipFirstNumber(inputText);
    const allowZeroLengthSelection = hasAllowZeroLengthSelection(inputText);
    const expectedText = normalizeText(await fs.readFile(expectedfile, 'utf8'));
    const document = await vscode.workspace.openTextDocument();
    const editor = await vscode.window.showTextDocument(document);
    await editor.edit((editBuilder) =>
        editBuilder.insert(new vscode.Position(0, 0), inputText)
    );
    // mi assicuro che l'editor del documento sia quello attivo
    assert.deepStrictEqual(editor, vscode.window.activeTextEditor);
    // seleziono tutto
    await vscode.commands.executeCommand('editor.action.selectAll');
    // incremento tutti i numeri trovati nella selezione di 1
    await vscode.commands.executeCommand(
        'progressive.incrementByInput',
        skipFirstNumber,
        allowZeroLengthSelection,
        increment
    );
    // verifico che il testo modificato sia corretto
    const text = normalizeText(editor.document.getText());
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    assert.strictEqual(
        text,
        expectedText,
        `File: '${testfile}' increment=${increment} skipFirstNumber=${skipFirstNumber} allowZeroLengthSelection=${allowZeroLengthSelection}`
    );
}

/**
 * Seleziona riga per riga ed esegue l'incremento.
 *
 * @param {String} testfile
 * @param {String} expectedfile
 */
async function splitSelectionAndIncrements(
    testfile,
    expectedfile,
    increment = 1
) {
    const inputText = await fs.readFile(testfile, 'utf8');
    const skipFirstNumber = hasSkipFirstNumber(inputText);
    const allowZeroLengthSelection = hasAllowZeroLengthSelection(inputText);
    const expectedText = normalizeText(await fs.readFile(expectedfile, 'utf8'));
    const document = await vscode.workspace.openTextDocument();
    const editor = await vscode.window.showTextDocument(document);
    await editor.edit((editBuilder) =>
        editBuilder.insert(new vscode.Position(0, 0), inputText)
    );
    // mi assicuro che l'editor del documento sia quello attivo
    assert.deepStrictEqual(editor, vscode.window.activeTextEditor);
    // seleziono tutto e splitto la selezione su ogni riga
    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand(
        'editor.action.insertCursorAtEndOfEachLineSelected'
    );
    await vscode.commands.executeCommand('cursorHomeSelect');
    // incremento tutti i numeri trovati nella selezione di 1
    await vscode.commands.executeCommand(
        'progressive.incrementByInput',
        skipFirstNumber,
        allowZeroLengthSelection,
        increment
    );
    // verifico che il testo modificato sia corretto
    const text = normalizeText(editor.document.getText());
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    assert.strictEqual(
        text,
        expectedText,
        `File: '${testfile}' increment=${increment} skipFirstNumber=${skipFirstNumber} allowZeroLengthSelection=${allowZeroLengthSelection}`
    );
}

function hasSkipFirstNumber(text) {
    return /^##.*skipFirstNumber.*\n/i.test(text);
}

function hasAllowZeroLengthSelection(text) {
    return /^##.*allowZeroLengthSelection.*\n/i.test(text);
}

function normalizeText(text) {
    return text ? text.replace(/\r\n/g, '\n') : '';
}

suite('Select all', async function () {
    const folder = path.join(__dirname, 'cases');

    test('Increment all by 1: test1.test', async () =>
        await selectAllAndIncrements(
            path.join(folder, 'test1.test'),
            path.join(folder, 'test1.expected')
        ));
    test('Increment all by 1: test2.test', async () =>
        await selectAllAndIncrements(
            path.join(folder, 'test2.test'),
            path.join(folder, 'test2.expected')
        ));
    test('Increment all by 1: test3.test', async () =>
        await selectAllAndIncrements(
            path.join(folder, 'test3.test'),
            path.join(folder, 'test3.expected')
        ));
    test('Increment all by 1: test4.test', async () =>
        await selectAllAndIncrements(
            path.join(folder, 'test4.test'),
            path.join(folder, 'test4.expected')
        ));
    test('Increment all by 1: test1_skipfirst.test', async () =>
        await selectAllAndIncrements(
            path.join(folder, 'test1_skipfirst.test'),
            path.join(folder, 'test1_skipfirst.expected')
        ));
    test('Increment all by 100: test5.test', async () =>
        await selectAllAndIncrements(
            path.join(folder, 'test5.test'),
            path.join(folder, 'test5.expected'),
            100
        ));
});

suite('Split selections', async function () {
    const folder = path.join(__dirname, 'cases');

    test('Increment all by 1: test1.test', async () =>
        await splitSelectionAndIncrements(
            path.join(folder, 'test1.test'),
            path.join(folder, 'test1.expected')
        ));
    test('Increment all by 1: test2.test', async () =>
        await splitSelectionAndIncrements(
            path.join(folder, 'test2.test'),
            path.join(folder, 'test2.expected')
        ));
    test('Increment all by 1: test3.test', async () =>
        await splitSelectionAndIncrements(
            path.join(folder, 'test3.test'),
            path.join(folder, 'test3.expected')
        ));
    test('Increment all by 1: test4.test', async () =>
        await splitSelectionAndIncrements(
            path.join(folder, 'test4.test'),
            path.join(folder, 'test4.expected')
        ));
    test('Increment all by 1: test1_skipfirst.test', async () =>
        await splitSelectionAndIncrements(
            path.join(folder, 'test1_skipfirst.test'),
            path.join(folder, 'test1_skipfirst.expected')
        ));
    test('Increment all by 100: test5.test', async () =>
        await splitSelectionAndIncrements(
            path.join(folder, 'test5.test'),
            path.join(folder, 'test5.expected'),
            100
        ));
});
