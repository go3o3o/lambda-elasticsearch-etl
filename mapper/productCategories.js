const { nullProc } = require('./util')
const mapper = (value) => {
  const ret = {}
  ret.id = nullProc(value._id, 'id')
  ret.category_id = nullProc(value._id, 'id')
  ret.name = nullProc(value.name, 'string')
  ret.date_created = nullProc(value.date_created, 'date')
  ret.date_updated = nullProc(value.date_updated, 'date')
  ret.description = nullProc(value.description, 'html')
  ret.is_enabled = value.enabled || false
  ret.category_join = {
    name: 'category',
  }

  return ret
}
module.exports = mapper
