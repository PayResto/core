const requestIp = require('request-ip')
const config = require('app/core/config')
const isLocalhost = require('app/utils/is-localhost')

const register = async (server, options) => {
  const _headers = {
    port: config.server.port,
    os: require('os').platform(),
    version: config.server.version,
    nethash: config.network.nethash
  }

  const requiredHeaders = ['port', 'nethash', 'os', 'version']

  server.ext({
    type: 'onRequest',
    method: async (request, h) => {
      if ((request.path.startsWith('/internal/') || request.path.startsWith('/remote/')) && !isLocalhost(request.info.remoteAddress)) {
        return h.response({
          code: 'ResourceNotFound',
          message: `${request.path} does not exist`
        }).code(400).takeover()
      }

      if (request.path.startsWith('/peer/')) {
        const peer = {}
        peer.ip = requestIp.getClientIp(request);
        requiredHeaders.forEach(key => (peer[key] = request.headers[key]))

        try {
          await server.app.p2p.acceptNewPeer(peer)

          const response = request.response
          requiredHeaders.forEach((key) => response.header(key, _headers[key]))
        } catch (error) {
          return h.response({ success: false, message: error.message }).code(500).takeover()
        }
      }

      return h.continue
    }
  })
}

exports.plugin = {
  name: 'hapi-caster',
  version: '1.0.0',
  register
}
