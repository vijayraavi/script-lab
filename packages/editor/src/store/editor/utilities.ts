import prettier from 'prettier/standalone'
import librariesIntellisenseJSON from './librariesIntellisense'
import { schema as SettingsSchema } from '../../settings'
import { SETTINGS_FILE_ID } from '../../constants'

function doesMonacoExist() {
  const w = window as any
  return !!w.monaco
}

const Regex = {
  STARTS_WITH_TYPINGS: /^.types\/.+|^dt~.+/i,
  STARTS_WITH_COMMENT: /^#.*|^\/\/.*|^\/\*.*|.*\*\/$.*/im,
  ENDS_WITH_CSS: /.*\.css$/i,
  ENDS_WITH_DTS: /.*\.d\.ts$/i,
  GLOBAL: /^.*/i,
  TRIPLE_SLASH_REF: /\/\/\/\s*<reference\spath="([\w\.\d]+\.d\.ts)"\s*\/>/gm,
}

export function registerLibrariesMonacoLanguage() {
  if (!doesMonacoExist()) {
    return
  }

  monaco.languages.register({ id: 'libraries' })
  monaco.languages.setMonarchTokensProvider('libraries', {
    tokenizer: {
      root: [
        { regex: Regex.STARTS_WITH_COMMENT, action: { token: 'comment' } },
        { regex: Regex.ENDS_WITH_CSS, action: { token: 'number' } },
        { regex: Regex.STARTS_WITH_TYPINGS, action: { token: 'string' } },
        { regex: Regex.ENDS_WITH_DTS, action: { token: 'string' } },
        { regex: Regex.GLOBAL, action: { token: 'keyword' } },
      ],
    },
    tokenPostfix: '',
  })

  monaco.languages.registerCompletionItemProvider('libraries', {
    provideCompletionItems: (model, position) => {
      const currentLine = model.getValueInRange({
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: 1,
        endColumn: position.column,
      })

      if (Regex.STARTS_WITH_COMMENT.test(currentLine)) {
        return []
      }

      if (currentLine === '') {
        return librariesIntellisenseJSON.map(library => {
          let insertText = ''

          if (Array.isArray(library.value)) {
            insertText += library.value.join('\n')
          } else {
            insertText += library.value || ''
            insertText += '\n'
          }

          if (Array.isArray(library.typings)) {
            insertText += (library.typings as string[]).join('\n')
          } else {
            insertText += library.typings || ''
            insertText += '\n'
          }

          return {
            label: library.label,
            documentation: library.description,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText,
          }
        })
      }

      return Promise.resolve([])
    },
  })
}

export function registerSettingsMonacoLanguage() {
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [
      {
        uri: SettingsSchema.$id,
        fileMatch: [
          new monaco.Uri()
            .with({
              scheme: 'file',
              path: SETTINGS_FILE_ID,
            })
            .toString(),
        ],
        schema: SettingsSchema,
      },
    ],
  })
}

export function enablePrettierInMonaco() {
  import('prettier/parser-typescript').then(prettierTypeScript => {
    /* Adds Prettier Formatting to Monaco for TypeScript */
    const PrettierTypeScriptFormatter: monaco.languages.DocumentFormattingEditProvider = {
      provideDocumentFormattingEdits: (
        document: monaco.editor.ITextModel,
        options: monaco.languages.FormattingOptions,
        token: monaco.CancellationToken,
      ): monaco.languages.TextEdit[] => {
        const text = document.getValue()
        const formatted = prettier.format(text, {
          parser: 'typescript',
          plugins: [prettierTypeScript],
        })

        return [
          {
            range: document.getFullModelRange(),
            text: formatted,
          },
        ]
      },
    }

    monaco.languages.registerDocumentFormattingEditProvider(
      'typescript',
      PrettierTypeScriptFormatter,
    )
  })
}
