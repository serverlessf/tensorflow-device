const $h2 = document.querySelector('h2');
const $form = document.querySelector('form');
const $name = document.querySelector('#name');
const $git = document.querySelector('#git');
const $url = document.querySelector('#url');
const $file = document.querySelector('#file');
var options = {};



function searchParse(search) {
  var search = search.substring(1);
  return search? JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"')
  .replace(/&/g, '","').replace(/=/g,'":"') + '"}'):{};
}

function onReady() {
  var o = searchParse(location.search);
  console.log('onReady()', o);
  m.render($h2, [o.service||o.process, m('div', m('small', o.engine||''))]);
  document.body.className = o.service? 'service':'process';
  if(o.update) $name.setAttribute('disabled', 'disabled');
  $name.value = o.service||o.process;
  return o;
}

function onSubmit() {
  var data = new FormData($form);
  if(o.update) data.update = true;
  var type = o.service? 'service':'process';
  m.request({method: 'POST', url: '/'+type, data}).then((data) => {
    iziToast.success({message: `Created ${type} ${$form.name.value}`});
  }, (err) => iziToast.error({message: err.message}));
  return false;
}



options = onReady();
$form.onSubmit = onSubmit;
