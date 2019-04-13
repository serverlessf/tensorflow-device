const $editor = document.querySelector('#editor');
const editor = ace.edit('editor');




function setup() {
  editor.setTheme('ace/theme/monakai');
  editor.session.setMode('ace/mode/json');
}
