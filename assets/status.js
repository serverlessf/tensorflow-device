const $editor = document.querySelector('#editor');
const editor = ace.edit('editor', {
  theme: 'ace/theme/monakai',
  mode: 'ace/mode/json',
  minLines: 30,
  maxLines: 30,
});



function searchParse(search) {
  var search = search.substring(1);
  return search? JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"')
  .replace(/&/g, '","').replace(/=/g,'":"') + '"}'):{};
}

function onReady() {
  var o = searchParse(location.search);
  console.log('onReady()', o);
  $upload.setAttribute('href', `/upload.html?image=${o.image}&from=${o.from}&update=1`);
  $logs.setAttribute('href', `/logs.html?image=${o.image}&from=${o.from}`);
  return o;
}

function setup() {
}
setup();
