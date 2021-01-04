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

exports.toHtmlTable = (title, dict, slug_exp) => {
  let style = "<style>body{font-family: sans-serif;}#myInput {background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAACYktHRAD/h4/MvwAAAAl2cEFnAAABKgAAASkAUBZlMQAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAxMy0wNC0xMFQwNjo1OTowNy0wNzowMI5BiVEAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMTMtMDQtMTBUMDY6NTk6MDctMDc6MDD/HDHtAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAABF0RVh0VGl0bGUAc2VhcmNoLWljb27Cg+x9AAACKklEQVQ4T6WUSavqQBCFK+2sII7gShFXLpUsBBHFf+1KcAQFwaWiolsnnBDn++4p0iHRqPDuByFJd/Wp6qrqVn5+IQP3+52m0ymtVis6Ho885na7KRgMUiKR4O9vmEQHgwGNx2NyOp0khCBFUXgcJo/Hg67XK8ViMcpkMjz+Dl200+nQZrMhh8PBE4gYQgDidrudvzEOm2KxyP9WsCginM1mHKEUS6VSFA6HOWI4G41GPAfx2+1GgUCAVFXVZMwovwY/lUqFPB4PiyFn+XxemzbT6/VovV6z8Ol0olwux+LPCBQFEQKIvhME2WyWbWGHFCD/VghUGVvE1rDlb6TTabbFmuVyqY2aEWgbFALeI5GINvyeUCjEtlgju+IZoRWfkS30CURoxFJUNjMEt9stf38CNjJKIFvNiMBJgTebzcZt843hcMhCELWqPBDxeJwulwtvC/3X7/e1qVfgFD0rC5tMJrUZM8Lr9VI0GmVBRDCfz6nZbHI/Sna7HXW7XZpMJtxSiBIP1lmhH9NqtaqfGKQDTmQREBnSgwfmMqfYYblc1o+2xHShtNttLgSiee4EmMEp3hDBPJzikimVSuRyuTTLJ1GwWCz4pCB3UhiL/X4/Hw50C5zjLSM+n898weCogxdRIzAGxigAdtNqtV6EC4UC+Xy+z6Kf2O/31Gg0TMK4ZBDxf4uCw+FA9XpdF0aaUOg/iQLcHbVaTb/p0Cl/FgXIJ/oYnaCqKv0DC6dltH6Ks84AAAAASUVORK5CYII=');background-position: 10px 12px;background-repeat: no-repeat;width: 100%;padding: 12px 20px 12px 40px;border: 1px solid #ddd; margin-bottom: 12px;}#myTable {border-collapse: collapse;width: 100%; border: 1px solid #ddd;font-size: 1.1em; } #myTable th, #myTable td {text-align: left; padding: 12px;} #myTable tr {border-bottom: 1px solid #ddd;} #myTable tr.header, #myTable tr:hover {background-color: #f1f1f1;}</style>";
  let script = '<script>function search() {let input, filter, table, tr, td, i, txtValue;input = document.getElementById("myInput");filter = input.value.toUpperCase();table = document.getElementById("myTable");tr = table.getElementsByTagName("tr");for (i = 0; i < tr.length; i++) {td = tr[i].getElementsByTagName("td")[1];if (td) {txtValue = td.textContent || td.innerText;if (txtValue.toUpperCase().indexOf(filter) > -1) {tr[i].style.display = "";} else {tr[i].style.display = "none";}}}}</script>';
  // TODO: stamp names and not slug
  let html = `<html><head>${style}<title>${title}</title></head><body><h1>${title}</h1><input type="text" id="myInput" onkeyup="search()" placeholder="Search for names.."><table id="myTable">`;
  let row = `<tr><th>Player id</th>`
  for(let header in dict[Object.keys(dict)[0]]){
    let text = '';
    if(slug_exp[header] !== undefined){
      text = slug_exp[header]
    } else { 
      text = header
    }
    row += `<th>${text}</th>`
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
  html += `</table>${script}</body></html>`
  fs.writeFile(`${title}.html`, html, (err) => {
    if (err) {
        throw err;
    }
    console.log(exports.stamp_now(),"HTML file is saved.");
  });
}

exports.getSquad = (list) => {
  console.log(list)
  let dict_of_names_of_squads = {};
  for (let i = 0; i < list.length; i++) {
    if(dict_of_names_of_squads[list[i]['squad']] === undefined){
      dict_of_names_of_squads[list[i]['squad']] = [];
    }
    dict_of_names_of_squads[list[i]['squad']].push(list[i]['name']);
  }
  return dict_of_names_of_squads;
}