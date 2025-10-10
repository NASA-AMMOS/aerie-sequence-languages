import { indentSelection } from '@codemirror/commands';
import type { EditorView } from 'codemirror';

export function seqNFormat(editorSequenceView: EditorView) {
  // apply indentation
  editorSequenceView.update([
    editorSequenceView.state.update({
      selection: { anchor: 0, head: editorSequenceView.state.doc.length },
    }),
  ]);
  indentSelection({
    dispatch: transaction => editorSequenceView.update([transaction]),
    state: editorSequenceView.state,
  });
  // clear selection
  editorSequenceView.update([
    editorSequenceView.state.update({
      selection: { anchor: 0, head: 0 },
    }),
  ]);
}
