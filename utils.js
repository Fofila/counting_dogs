exports.stamp = (text='...',args={}) => {
  let now = new Date()
  let date = `[${now.getDate()}/${now.getMonth()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}]`
  let str = date+`${user}:${text}`
  for(let i in args){
    // TODO: convert everything in text
    str += i
  }
  return str
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

// export {stamp, clearName, clearSquad};