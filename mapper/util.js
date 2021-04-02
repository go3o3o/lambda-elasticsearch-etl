const extractID = (id) => {
  return id['$oid']
}
const extractDate = (date) => {
  return date['$date']
}
const isEmpty = (value) => {
  if (value == '' || value == null || value == undefined || value == 'null' || (value != null && typeof value == 'object' && !Object.keys(value).length)) {
    return true
  } else {
    return false
  }
}
exports.nullProc = (val, type) => {
  if (type === 'html') {
    if (isEmpty(val)) return null
    else return val.trim().replace(/<[^>]*>?/gm, '') //remove tag
  }
  if (type === 'id') {
    if (isEmpty(val)) return null
    else return extractID(val)
  } else if (type === 'string') {
    // console.log('==Str==> ', val, isEmpty(val))
    if (isEmpty(val)) return null
    else if (typeof val === 'number') {
      // console.log('Number => ', typeof val, val)
      return val.toString()
    } else {
      return val.replace(/^\s+/g, '').replace(/\s+$/g, '')
    }
  } else if (type === 'date') {
    if (isEmpty(val)) return null
    else return extractDate(val)
  } else if (type === 'number') {
    if (isEmpty(val)) return 0
    else {
      if (typeof val === 'string') return Number(val)
      else return val
    }
  }
}
