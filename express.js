const express = require('express')
const http = require('http')
const address = require('address')
const portfinder = require('portfinder')
const bodyParser = require('body-parser')
const routers = require('./router')

const defaults = {
    host: '0.0.0.0',
    port: 8080
}

async function start () {
    const host = defaults.host
    portfinder.basePort = defaults.port
    // 获取一个可用端口
    const port = await portfinder.getPortPromise()

    const app = express()
    const server = http.createServer(app)

    app.use(bodyParser.json({limit: '2mb'}))
    app.use(bodyParser.urlencoded({limit: '2mb', extended: true}))
    app.use(bodyParser.raw())
    // 错误拦截器
    app.use((err, req, res, next) => {
        console.log(err)
        res.status(500).send('server has error')
    })
    // 自定义拦截器
    app.use((req, res, next) => {
        console.log(req.headers)
        // console.log('request body: ', req.body)
        console.log('request query: ', req.query)
        next()
        console.log('result')
    })
    // 静态资源
    app.use('/', express.static('public'))
    app.use('/file', express.static('upload'))
    app.use(routers)

    // app.all('/', (req, res) => {
    //     console.log(req.body, req.query)
    //     res.json({res: 'hi'})
    // })

    server.on('error', (err) => {
        // 端口冲突则端口加1并重启
        // if (err.code === 'EADDRINUSE') {
        //     port++
        //     server.listen(port)
        //     return
        // }
        console.log('server has error: ', err)
    })

    server.on('listening', () => {
        console.log('  server listening: ')
        console.log('  - Local:   ', 'http://localhost:' + port)
        console.log('  - Network: ', `http://${host === '0.0.0.0' ? address.ip() : host}:${port}`)
    })

    server.listen(port, host)
}

start()