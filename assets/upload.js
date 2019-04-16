const $h2 = document.querySelector('h2');
const $form = document.querySelector('form');
const $id = document.querySelector('#id');
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

function filename(url) {
  var bi = url.lastIndexOf('/');
  var basename = url.substring(bi+1);
  var ei = basename.lastIndexOf('.');
  return ei<0? basename:basename.substring(0, ei);
}

function onChange() {
  $id.value = $id.value||filename($gitUrl.value||$fileUrl.value||$fileUpload.value);
}

function onReady() {
  var o = searchParse(location.search);
  console.log('onReady()', o);
  document.body.className = o.image!=null? 'image':'container';
  $id.value = o.image||o.container||'';
  $from.value = o.from||$from.value||'';
  return o;
}

function onSubmit(o) {
  var data = new FormData($form);
  var id = $form.id.value;
  var from = $form.from.value;
  data.set('update', o.update||false);
  if(!from) data.delete('from');
  console.log('onSubmit()', data);
  var pre = o.update? 'Updated':'Created';
  var type = o.image!=null? 'image':'container';
  m.request({method: 'POST', url: '/'+type, data}).then(data => {
    iziToast.success({message: `${pre} ${type} ${id}`});
  }, err => iziToast.error({message: err.message}));
  var url = `/logs.html?image=${id}&from=${from}`;
  setTimeout(() => location.href = location.origin+url, 1000);
  return false;
}



options = onReady();
$form.onsubmit = () => onSubmit(options);
$gitUrl.onchange = $fileUrl.onchange = $fileUpload.onchange = onChange;
