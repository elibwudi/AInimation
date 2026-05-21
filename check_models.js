const key = 'AIzaSyAEVicX5kpacvGcUvcV2KWUGzqoW2VXJSU';
fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key)
  .then(r => r.json())
  .then(d => {
    if (d.models) {
      console.log('Available Models:');
      d.models.forEach(m => console.log('- ' + m.name));
    } else {
      console.log('No models found or error:', d);
    }
  })
  .catch(console.error);
