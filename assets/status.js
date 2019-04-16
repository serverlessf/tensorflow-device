const $h2 = document.querySelector('h2');
const $write = document.querySelector('#write');
const $get = document.querySelector('#get');
const $post = document.querySelector('#post');
const $editor = document.querySelector('#editor');
const editor = ace.edit('editor', {
  theme: 'ace/theme/github',
  mode: 'ace/mode/json',
  minLines: 30,
  maxLines: 30,
});
var options = {};



function searchParse(search) {
  var search = search.substring(1);
  return search? JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"')
  .replace(/&/g, '","').replace(/=/g,'":"') + '"}'):{};
}

function mode(o) {
  if(o.image) return 'image';
  if(o.container) return 'container';
  return 'status';
}

function url(o) {
  if(o.image) return `/image/${o.image}/status`;
  if(o.container) return `/container/${o.container}/status`;
  return `/status`;
}

function message(o) {
  if(o.image) return `Status saved to image ${o.image}`;
  if(o.container) return `Status saved to container ${o.container}`;
  return `Status saved to device`;
}

function onReady() {
  var o = searchParse(location.search);
  console.log('onReady()', o);
  document.body.className = mode(o);
  m.render($h2, [o.image||o.container, m('div', m('small', o.from))]);
  $write.checked = !!o.write;
  onGet(o);
  return o;
}

function onGet(o) {
  console.log('onGet()', o);
  var write = o.write? '?write=1':'';
  m.request({method: 'GET', url: url(o)+write}).then((data) => {
    editor.setValue(JSON.stringify(data, null, 2)); editor.gotoLine(1);
  }, (err) => iziToast.error({message: err.message}));
  return false;
}

function onPost(o) {
  console.log('onPost()', o);
  var data = JSON.parse(editor.getValue());
  m.request({method: 'POST', url: url(o), data}).then(() => {
    iziToast.success({message: message(o)});
  }, (err) => iziToast.error({message: err.message}));
  return false;
}

options = onReady();
$write.onchange = () => options.write = $write.checked;
$get.onclick = () => onGet(options);
$post.onclick = () => onPost(options);
