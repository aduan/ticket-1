const crypto = require('crypto')
const AV = require('leanengine')

const config = require('../config')

exports.getTinyUserInfo = (user) => {
  if (user.get('username')) {
    return Promise.resolve({
      objectId: user.id,
      username: user.get('username'),
      gravatarHash: getGravatarHash(user.get('email'))
    })
  }
  return user.fetch({}, {useMasterKey: true}).then((user) => {
    return {
      objectId: user.id,
      username: user.get('username'),
      gravatarHash: getGravatarHash(user.get('email'))
    }
  })
}

exports.getTinyReplyInfo = (reply) => {
  return exports.getTinyUserInfo(reply.get('author'))
    .then((author) => {
      return {
        author,
        content: reply.get('content'),
        isCustomerService: reply.get('isCustomerService'),
        createdAt: reply.get('createdAt'),
        updatedAt: reply.get('updatedAt'),
      }
    })
}

exports.isCustomerService = (user) => {
  if (!user) {
    return Promise.resolve(false)
  }
  return new AV.Query(AV.Role)
    .equalTo('name', 'customerService')
    .equalTo('users', user)
    .first()
    .then((role) => {
      return !!role
    })
}

exports.getTicketUrl = (ticket) => {
  return `${config.host}/tickets/${ticket.get('nid')}`
}

const getGravatarHash = (email) => {
  email = email || ''
  const shasum = crypto.createHash('md5')
  shasum.update(email.trim().toLocaleLowerCase())
  return shasum.digest('hex')
}
