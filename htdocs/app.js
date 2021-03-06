/* global Vue, WebSocket */

Vue.config.devtools = true

var vm = new Vue({
  el: '#app',
  data: {
    // UI
    drawer: null,
    view: 'socket',
    dialog: false,

    // websocket
    connected: false,
    auth: false,
    password: '',
    pwVis: true,

    // backend
    sockets: [],
    headers: [
      {
        text: 'Socket',
        align: 'left',
        sortable: false,
        value: 'name'
      },
      {
        text: 'Action',
        value: 'action'
      },
      {
        text: 'Mode',
        value: 'mode'
      },
      {
        text: 'Offset',
        value: 'offset'
      },
      {
        text: 'Time',
        value: 'time'
      }
    ],
    timers: [],

    // timer dialog
    editedIndex: -1,
    editedTimer: {
      socket_id: 0,
      action: 0,
      mode: 'time',
      offset: 0,
      time: '* * * * *'
    },
    defaultTimer: {
      socket_id: 0,
      action: 0,
      mode: 'time',
      offset: 0,
      time: '* * * * *'
    },
    modes: [
      {
        text: 'Time',
        value: 'time'
      },
      {
        text: 'Dawn',
        value: 'dawn'
      },
      {
        text: 'Sunrise',
        value: 'sunrise'
      },
      {
        text: 'Noon',
        value: 'solarNoon'
      },
      {
        text: 'Sunset',
        value: 'sunset'
      },
      {
        text: 'Dusk',
        value: 'dusk'
      }
    ],
    actions: [
      {
        text: 'Off',
        value: 0
      },
      {
        text: 'On',
        value: 1
      }
    ]

  },

  methods: {
    send: function (raw) {
      ws.send(JSON.stringify(raw))
    },
    power: function (id, action) {
      this.socketWithID(id).status = action
      this.send({
        'type': 'toggle',
        'id': id,
        'action': action
      })
    },
    setView: function (view) {
      this.view = view
      this.drawer = window.innerWidth > 1024 // 1024px = Responsive level laptop
    },
    editTimer (item) {
      this.editedIndex = this.timers.indexOf(item)
      this.editedTimer = Object.assign({}, item)
      this.dialog = true
    },
    close () {
      this.dialog = false
      setTimeout(() => {
        this.editedTimer = Object.assign({}, this.defaultTimer)
        this.editedIndex = -1
      }, 300)
    },

    save () {
      if (this.editedIndex > -1) {
        Object.assign(this.timers[this.editedIndex], this.editedTimer)
      } else {
        this.timers.push(this.editedTimer)
      }
      this.timer()
      this.close()
    },
    timer: function () {
      this.send({
        'type': 'timers',
        'timers': this.timers
      })
    },
    login: function (password) {
      this.send({
        'type': 'login',
        'password': password
      })
      this.password = ''
    },
    logout: function () {
      this.sockets = []
      this.timers = []
      vm.auth = false
      document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      this.send({
        'type': 'logout'
      })
    },
    socketWithID: function (id) {
      var res
      this.sockets.some(function (item) {
        if (item.id === id) {
          res = item
          return true
        }
      })
      return res
    }
  },
  computed: {
    formTitle () {
      return this.editedIndex === -1 ? 'New Timer' : 'Edit Timer'
    }
  },

  watch: {
    dialog (val) {
      val || this.close()
    }
  }
})

// Create WebSocket connection.
var ws = connectWebsocket(getProtocol() + '//' + window.location.hostname + '/websocket/')

function connectWebsocket (url) {
  var result = new WebSocket(url)

  // Connection opened
  result.onopen = function (event) {
    console.log('WebSocket: connected')
    vm.connected = true
    vm.auth = false
    vm.login(getCookie('auth'))
  }

  // Listen for messages
  result.onmessage = function (event) {
    incoming(event.data)
  }

  result.onerror = (e) => {}

  result.onclose = function (e) {
    console.log('WebSocket: disconnected')
    vm.connected = false
    setTimeout(() => {
      ws = connectWebsocket(url)
    }, 1000)
  }

  return result
}

function incoming (input) {
  var data
  try {
    data = JSON.parse(input)
  } catch (e) {
    console.log(e)
  }
  switch (data.type) {
    case 'sockets':
      vm.sockets = data.sockets
      break
    case 'timers':
      vm.timers = data.timers
      break
    case 'auth':
      vm.auth = data.auth
      if (vm.auth) {
        setCookie('auth', data.cookie, 3000)
      }
      break
  }
  console.log('received: ' + data.type)
}

function setCookie (cname, cvalue, exdays) {
  var d = new Date()
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000))
  var expires = 'expires=' + d.toUTCString()
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/'
}

function getCookie (cname) {
  var name = cname + '='
  var ca = document.cookie.split(';')
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i]
    while (c.charAt(0) === ' ') {
      c = c.substring(1)
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length)
    }
  }
  return ''
}

function getProtocol () {
  if (window.location.protocol === 'https:') {
    return 'wss:'
  } else {
    return 'ws:'
  }
}
