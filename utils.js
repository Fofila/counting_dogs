const fs = require('fs');

exports.stamp_now = (text='...',args={}) => {
  let now = new Date()
  let date = (('' + now.getUTCDate()).length === 1) ? '0'+now.getUTCDate() : now.getUTCDate()
  let month = (('' + now.getUTCMonth()).length === 1) ? '0'+(now.getUTCMonth()+1) : now.getUTCMonth()+1
  let hour = (('' + now.getUTCHours()).length === 1) ? '0'+now.getUTCHours() : now.getUTCHours()
  let minutes = (('' + now.getUTCMinutes()).length === 1) ? '0'+now.getUTCMinutes() : now.getUTCMinutes()
  let seconds = (('' + now.getUTCSeconds()).length === 1) ? '0'+now.getUTCSeconds() : now.getUTCSeconds()
  return date = `[${date}/${month}/${now.getUTCFullYear()} ${hour}:${minutes}:${seconds}]`
}

exports.clearName = (name) => {
  name = name.toLowerCase();
  name = name.substring(name.indexOf('@') + 1);
  name = name.substring(name.indexOf(']') + 1);
  return name.trim()
}

exports.clearSquad = (squad, squads, names) => {
  let message = '';
  if(squads.indexOf(squad) !== -1){
    message = `Cleaned squad ${squad}\n`
    message += 'These players are without a squad:\n'
    for (let i = 0; i < names.length; i++) {
      if(names[i]['squad'] === squad){
        message += `${names[i]['name']}\n`
      }
    }
  }else{
    message = `There is no squad ${squad}`;
  }
  return message;
}

exports.toHtmlTable = (title, dict) => {
  // TODO: stamp names and not slug
  let html = `<html><head><title>${title}</title></head><body><table>`;
  // TODO: add headers
  let row = `<tr><th>Player id</th>`
  for(let header in dict[Object.keys(dict)[0]]){
    row += `<th>${header}</th>`
  }
  row += '</tr>'
  html += row
  for(let player_id in dict){
    let row = `<tr><td>${player_id}</td>`
    for(let data in dict[player_id]){
      row += `<td>${dict[player_id][data]}</td>`
    }
    row += '</tr>';
    html += row;
  }
  html += '</table></body></html>'
  fs.writeFile(`${title}.html`, html, (err) => {
    if (err) {
        throw err;
    }
    console.log(exports.stamp_now(),"HTML file is saved.");
  });
}