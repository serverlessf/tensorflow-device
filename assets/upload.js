const $h2 = document.querySelector('h2');
const $form = document.querySelector('form');
const $name = document.querySelector('#name');
const $from = document.querySelector('#from');
const $gitUrl = document.querySelector('#gitUrl');
const $fileUrl = document.querySelector('#fileUrl');
const $fileUpload = document.querySelector('#fileUpload');
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
  if(o.update) $name.setAttribute('disabled', 'disabled');
  $name.value = o.image||o.container||'';
  return o;
}

function onSubmit(o) {
  var data = new FormData($form);
  data.set('name', $form.name.value);
  data.set('update', o.update||false);
  if(!$form.from.value) data.delete('from');
  console.log('onSubmit()', data);
  var pre = o.update? 'Updated':'Created';
  var type = o.image!=null? 'image':'container';
  m.request({method: 'POST', url: '/'+type, data}).then((data) => {
    iziToast.success({message: `${pre} ${type} ${$form.name.value}`});
  }, (err) => iziToast.error({message: err.message}));
  return false;
}



options = onReady();
$form.onsubmit = () => onSubmit(options);
