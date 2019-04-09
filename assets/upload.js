const $h2 = document.querySelector('h2');
const $form = document.querySelector('form');
const $id = document.querySelector('#id');
const $from = document.querySelector('#from');
const $gitUrl = document.querySelector('#gitUrl');
const $fileUrl = document.querySelector('#fileUrl');
const $fileUpload = document.querySelector('#fileUpload');
const $p = document.querySelector('p');
const $stdout = document.querySelector('#stdout');
var options = {};



function searchParse(search) {
  var search = search.substring(1);
  return search? JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"')
  .replace(/&/g, '","').replace(/=/g,'":"') + '"}'):{};
}

function onReady() {
  var o = searchParse(location.search);
  console.log('onReady()', o);
  m.render($h2, [o.image||o.container, m('div', m('small', o.from||''))]);
  document.body.className = o.image!=null? 'image':'container';
  if(o.update) $id.setAttribute('disabled', 'disabled');
  $id.value = o.image||o.container||'';
  return o;
}

function onSubmit(o) {
  var data = new FormData($form);
  data.set('name', $form.id.value);
  data.set('update', o.update||false);
  if(!$form.from.value) data.delete('from');
  console.log('onSubmit()', data);
  var pre = o.update? 'Updated':'Created';
  var type = o.image!=null? 'image':'container';
  m.request({method: 'POST', url: '/'+type, data}).then((data) => {
    iziToast.success({message: `${pre} ${type} ${$form.id.value}`});
  }, (err) => iziToast.error({message: err.message}));
  setInterval(() => requestLogs(options), 1000);
  return false;
}

function render(err, stdout, o) {
  var p = err? err.message||'':'';
  var ol = stdout.length, pl = p.length;
  if(ol===o.stdout && pl===o.p) return;
  console.log('render()', {ol, pl}, o);
  o.stdout = ol; o.p = pl;
  $stdout.innerHTML = ansi_up.ansi_to_html(stdout);
  $p.innerHTML = ansi_up.ansi_to_html(err? err.message:'');
}

function requestLogs(o) {
  console.log('requestLogs()', o);
  m.request({method: 'GET', url: `/image/${$form.id.value}/logs`}).then(
    stdout => render(null, stdout||'', o),
    (err) => render(err, '', err.message||'', o));
}



options = onReady();
$form.onsubmit = () => onSubmit(options);
