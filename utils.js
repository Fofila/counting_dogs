function stamp(text='...',args={}){
  let now = new Date()
  let date = `[${now.getDate()}/${now.getMonth()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}]`
  let str = date+`${user}:${text}`
  for(let i in args){
    // TODO: convert everything in text
    str += i
  }
  return str
}