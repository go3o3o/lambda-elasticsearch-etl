const sanitizeHtml = require('sanitize-html')
const { nullProc } = require('./util')
const mapper = (value) => {
  const now = new Date()
  // const ret = {}
  const ret = value
  ret.score = undefined

  const category_id = nullProc(value.category_id, 'id')
  const category_ids = value.category_ids.map((category_id) => nullProc(category_id, 'id'))
  let categoryIdList = []
  categoryIdList.push(category_id)
  if (value.category_ids && value.category_ids.length > 0) {
    categoryIdList = categoryIdList.concat(category_ids)
  }
  const categoryIdSet = Array.from(new Set(categoryIdList))

  ret.id = nullProc(value._id, 'id')
  ret.name = nullProc(value.name, 'string')
  ret.meta_title = nullProc(value.meta_title, 'string')
  ret.meta_description = nullProc(value.meta_description, 'string')

  let description = nullProc(value.description, 'string')
  if (description) {
    description = sanitizeHtml(description, { allowedTags: [] })
    description = description
      .trim()
      .replace(/&nbsp;/g, '')
      .replace(/&gt;/g, '')
      .replace(/&lt;/g, '')
      .replace(/\n/g, ' ')
  }
  // console.log(description)
  ret.description = description

  ret.sku = nullProc(value.sku, 'string')
  ret.slug = nullProc(value.slug, 'string')
  ret.weight = nullProc(value.weight, 'string')
  ret.cost_price = nullProc(value.cost_price, 'number')
  ret.regular_price = nullProc(value.regular_price, 'number')
  ret.sale_price = nullProc(value.sale_price, 'number')
  ret.category_id = category_id
  ret.category_id_list = categoryIdSet
  ret.category_ids = category_ids
  ret.quantity_inc = nullProc(value.quantity_inc, 'number')
  ret.quantity_min = nullProc(value.quantity_min, 'number')
  ret.stock_quantity = nullProc(value.stock_quantity, 'number')

  ret.images = value.images.map((image) => {
    return {
      id: nullProc(image.id, 'id'),
      alt: image.alt,
      position: image.position,
      filename: image.filename,
      url: `https://warehouse.medistream.co.kr/images/products/${ret.id}/${image.filename}`,
    }
  })
  ret.dimensions = value.dimensions
  ret.tags = value.tags
  ret.code = value.code
  ret.tax_class = value.tax_class
  ret.related_product_ids = value.related_product_ids
  ret.prices = value.prices
  ret.date_stock_expected = nullProc(value.date_stock_expected, 'date')
  ret.stock_tracking = value.stock_tracking
  ret.stock_preorder = value.stock_preorder
  ret.stock_backorder = value.stock_backorder

  ret.date_placed = nullProc(value.date_placed, 'date')
  ret.date_paid = nullProc(value.date_paid, 'date')
  ret.date_created = nullProc(value.date_created, 'date')
  ret.date_updated = nullProc(value.date_updated, 'date')
  ret.date_sale_from = nullProc(value.date_sale_from, 'date')
  ret.date_sale_to = nullProc(value.date_sale_to, 'date')

  ret.enabled = value.enabled || false
  ret.discontinued = value.discontinued || false

  ret.stock_preorder = value.stock_preorder || false
  ret.stock_backorder = value.stock_backorder || false
  ret.timestamp = now

  let supplier = ''
  let manufacturer = ''
  let item_kind = ''
  let item_origin = ''
  let item_weight = ''
  let author = ''

  const is_taxfree = value.category_ids.map((cId) => nullProc(cId, 'id')).filter((id) => id === '5f9a5f1b51203163343206bd').length === 1
  ret.is_taxfree = is_taxfree

  // const attributes = value.attributes.map((item) => ({
  //   name: nullProc(item.name, 'string'),
  //   value: nullProc(item.value, 'string'),
  // }))
  // const attributes = value.attributes.reduce((item, obj) => {
  //   item[obj.name] = obj.value
  //   return item
  // }, {})

  const attributes = value.attributes.map((item) => {
    if (item.name.includes('업체')) {
      supplier = item.value
    }
    if (item.name.includes('제조사')) {
      manufacturer = item.value
    }
    if (item.name.includes('원산지')) {
      item_origin = item.value
    }
    if (item.name.includes('품목명')) {
      item_kind = item.value
    }
    if (item.name === '용량' || item.name === '중량') {
      item_weight = item.value
    }
    if (item.name === '저자') {
      author = item.value
    }
    return {
      name: nullProc(item.name, 'string'),
      value: nullProc(item.value, 'string'),
    }
  })

  ret.supplier = supplier
  ret.manufacturer = manufacturer
  ret.item_origin = item_origin
  ret.item_kind = item_kind
  ret.item_weight = item_weight
  ret.author = author

  ret.attributes = attributes

  let options = []
  const optHash = {}

  ;(value.options || []).forEach((option) => {
    const opid = nullProc(option.id, 'id')
    optHash[opid] = {}
    const opt = option.values.map((v) => {
      const vid = nullProc(v.id, 'id')
      // console.log(opid, vid)

      optHash[opid][vid] = nullProc(v.name, 'string')
      return {
        option_id: nullProc(option.id, 'id'),
        name: nullProc(option.name, 'string'),
        value_id: nullProc(v.id, 'id'),
        sub_name: nullProc(v.name, 'string'),
      }
    })
    options = options.concat(opt)
  })
  ret.options = options

  const variants = (value.variants || []).map((va) => ({
    product_id: nullProc(value._id, 'id'),
    id: nullProc(va.id, 'id'),
    sku: nullProc(va.sku, 'string'),
    is_taxfree: is_taxfree,
    name: va.options
      .map((c) => {
        const opId = nullProc(c.option_id, 'id')
        const vId = nullProc(c.value_id, 'id')
        const op = optHash[opId]
        if (op) return optHash[opId][vId]
      })
      .join(', '),
    price_amt: nullProc(va.price, 'number'),
  }))
  ret.variants = variants

  ret.category_join = {
    name: 'product',
    parent: category_id,
  }

  // console.log(ret)

  delete ret._id

  return ret
}
module.exports = mapper
