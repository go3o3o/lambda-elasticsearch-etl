const { format } = require('date-fns')
const LOGGER = require('./logger')

const colors = [
  { name: 'cyan', value: '\x1b[36m' }, //0
  { name: 'yellow', value: '\x1b[33m' }, //1
  { name: 'red', value: '\x1b[31m' }, //2
  { name: 'green', value: '\x1b[32m' }, //3
  { name: 'magenta', value: '\x1b[35m' }, //4
]
const resetColor = '\x1b[0m'

const _LOGGER = (tag) => {
  // const randIdx = Math.floor(Math.random() * colors.length) % colors.length

  const color = getColor(tag)
  //   const time = datetime.create(new Date(), 'Y-m-d H:M:S.N')
  const time = format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSSxxx')

  const TAG = tag + getPadding(5 - tag.length)

  return (...msg) => {
    // console.log(`${color.value}[${time.format()}]`, ` ${TAG.toUpperCase()} - `, ...msg, `${resetColor}`)
    console.log(`[${color.value}${time}] ${TAG.toUpperCase()} -`, ...msg)
  }
}

function getColor(tag) {
  if ('debug' == tag) return colors[1]
  if ('info' == tag) return colors[0]
  if ('warn' == tag) return colors[4]
  if ('error' == tag) return colors[2]
  else return colors[3]
}

function getPadding(padCnt) {
  if (padCnt == 0) return ''
  else if (padCnt == 1) return ' '
  else if (padCnt == 2) return '  '
  else if (padCnt == 3) return '   '
  else return ''
}

class Logger {
  constructor(logger, bunyanLog) {
    this.log = bunyanLog

    this.logger = logger
    this.logger('info')('logger initiated!!')
  }

  info(...msg) {
    // log.info(...msg);
    return this.logger('info')(...msg)
  }

  debug(...msg) {
    // log.debug(...msg);
    return this.logger('debug')(...msg)
  }

  error(...msg) {
    // log.error(...msg);
    return this.logger('error')(...msg)
  }
  warn(...msg) {
    // log.warn(...msg);
    return this.logger('warn')(...msg)
  }
}

const logger = new Logger(_LOGGER, LOGGER)
module.exports = logger
